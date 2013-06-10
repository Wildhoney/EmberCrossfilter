/**
 * @module EmberCrossfilter
 * @class EmberCrossfilter
 * @type Ember.Mixin
 * Responsible for converting the loaded content into a Crossfilter object.
 */
window.EmberCrossfilter = Ember.Mixin.create({

    /**
    * @property _crossfilter
    * @type {Object}
    * @private
    */
    _crossfilter: null,

    /**
     * @property allowTiming
     * @type {Boolean}
     * Can be overridden by the class to allow for timing details to be output.
     */
    allowDebugging: false,

    /**
     * @method init
     * Invoked when the controller is instantiated.
     * @constructor
     */
    init: function() {

        this._super();

        // Add the observer to create the Crossfilter when we have some content.
        Ember.addObserver(this, 'content.length', this, '_createCrossfilter');

        // Create the Crossfilter.
        this._createCrossfilter();

    },

    /**
     * Determines if a particular filter is active or not.
     * @param key {String}
     * @param value {String|Number}
     * @return {Boolean}
     */
    isActiveFilter: function(key, value) {

        // Find the relevant `filterMap`.
        var map = this.filterMap[key];

        // If we're dealing with a `filterInArray`, then we need to perform a
        // small calculation on it.
        if (map.method === 'filterInArray') {

            // Gather the bitwise value.
            var bitwiseValue = map._mapProperties[value];

            if (map.boolean === 'or') {
                return Boolean((map.value & bitwiseValue));
            } else {
                return $.inArray(bitwiseValue, map.value) !== -1;
            }
        }

        // Otherwise the `active` property will tell us.
        return Ember.get(map, 'active') === true;

    },

    /**
     * @method addFilter
     * @param key
     * @param value
     * Applies a filter to one of our pre-defined dimensions.
     * @return {void}
     */
    addFilter: function(key, value) {

        // Find the map we're referencing by its name, and extract its method.
        var map = this.filterMap[key];

        if (map.method !== 'filterInArray') {

            // If we're dealing with a native Crossfilter method then we just need
            // to set the value, and enable the `active` property.
            map.value = value;
            Ember.set(map, 'active', true);

        } else {

            // Otherwise we're dealing with a `filterInArray`.
            // Firstly we need to push the value into the list of `active` elements,
            // and ensure it's unique.
            map.active.pushObject(value);
            map.active = map.active.uniq();

            if (map.boolean === 'or') {

                // If the boolean is "OR" then we need to add the bitwise.
                map.value |= map._mapProperties[value];

            } else {

                if (!Ember.isArray(map.value)) {
                    // Make it into an array if it isn't already.
                    map.value = [];
                }
                // Otherwise it needs to be placed into an array, so that each bitwise
                // value can be checked separately.
                map.value.push(map._mapProperties[value]);

            }
        }

        // Finally we can begin to update the content in the controller.
        this._updateContent(map);

    },

    /**
     * @method removeFilter
     * @param key
     * @param value
     * Clear the any applied filters to the dimension.
     * @return {void}
     */
    removeFilter: function(key, value) {

        // Find the `filterMap` that relates to this key.
        var map = this.filterMap[key];

        if (map.method !== 'filterInArray') {

            // If we're not dealing with a `filterInArray` then we can
            // set its value to false, and it's `active` as well.
            map.value = false;
            Ember.set(map, 'active', false);

        }

        if (map.method === 'filterInArray') {

            // Otherwise we'll need to take the value out of the list
            // of active values, and ensure it's unique.
            map.active.removeObject(value);
            map.active = map.active.uniq();

            if (map.boolean === 'or') {

                // If we're dealing with an "OR" then it needs to be deducted
                // from the current bitwise.
                if (map.value & map._mapProperties[value]) {
                    map.value ^= map._mapProperties[value];
                }

            } else {

                // Otherwise we simply take it out of the array.
                var index = map.value.indexOf(map._mapProperties[value]);
                map.value.splice(index, 1);

            }

        }

        // Voila!
        this._updateContent(map);

    },

    /**
     * @method clearAllFilters
     * Clears all of the filters that are currently active.
     * @return {void}
     */
    clearAllFilters: function() {

        var start = new Date().getTime();

        // Loop through all of the configured dimensions.
        for (var key in this.filterMap) {

            if (!this.filterMap.hasOwnProperty(key)) {
                continue;
            }

            // Find the map and the dimension by the current key.
            var map         = this.filterMap[key],
                dimension   = this['_dimension%@'.fmt(map.dimension.capitalize())];

            // Clear the applied Crossfilter.
            dimension.filterAll();

            // Clear the `active` flag and reset its value.
            Ember.set(map, 'active', false);
            map.value = null;

            if (map.method === 'filterInArray') {
                // If we're dealing with a `filterInArray`, then its default is 0.
                map.value = 0;
            }

        }

        // Update the changes with all of the filters removed.
        this._applyContentChanges();

        if (this.allowDebugging) {
            // Used for debugging purposes.
            Ember.debug('Clearing All: %@ millisecond(s)'.fmt(new Date().getTime() - start));
        }

    },

    /**
     * @method sortContent
     * Sorts the content based on the property, and whether it should be ascending/descending.
     * @param property {String}
     * @param isAscending {Boolean}
     * @return {void}
     */
    sortContent: function(property, isAscending) {

        // Sort the content and then place it into the content array.
        var content = this._sortedContent(Ember.get(this, 'content'), property, isAscending),
            start   = new Date().getTime();

        Ember.set(this, 'content', content);

        // Change the controller's variables so that you can see what's active.
        Ember.assert('In order to sort you must have a `sort` object defined.', !!Ember.get(this, 'sort'));
        Ember.assert('You must define `sortProperty` in your `sort` object.', !!Ember.get(this, 'sort.sortProperty'));
        Ember.set(this, 'sort.sortProperty', property);
        Ember.set(this, 'sort.isAscending', isAscending);

        // Notify that we've rearranged the content, otherwise there will be no update.
        this.notifyPropertyChange('content');

        if (this.allowDebugging) {
            // Debugging information.
            Ember.debug('Sorting: %@ millisecond(s)'.fmt(new Date().getTime() - start));
        }

    },

    /**
     * @method top
     * Helper method to find the highest value.
     * @param property {String}
     * @param count {Number}
     * @return {Number|String}
     */
    top: function(property, count) {
        return this._topBottom(property, count, 'top');
    },

    /**
     * @method bottom
     * Helper method to find the lowest value.
     * @param property {String}
     * @param count {Number}
     * @return {Number|String}
     */
    bottom: function(property, count) {
        return this._topBottom(property, count, 'bottom');
    },

    /**
     * @method _topBottom
     * @param key {String}
     * @param count {Number}
     * @param crossfilterMethod {String}
     * @return {Number|String}
     * @private
     */
    _topBottom: function(key, count, crossfilterMethod) {

        // Assert that we have a `filterMap` by this key.
        Ember.assert('Dimension with key "%@" is not defined.'.fmt(key), !!this.filterMap[key]);

        // Find the map and the related dimension.
        var map         = this.filterMap[key],
            dimension   = '_dimension%@'.fmt(map.dimension.capitalize());

        // Use Crossfilter method to find the top/bottom.
        return this[dimension][crossfilterMethod](count || 1)[0];

    },

    /**
     * @method _createCrossfilter
     * Creates the Crossfilter from the content.
     * @return {Boolean}
     * @private
     */
    _createCrossfilter: function() {

        // Assert that we have the `filterMap` property for configuring EmberCrossfilter.
        Ember.assert('Controller implements EmberCrossfilter but `filterMap` has not been specified.', !!this.filterMap);

        // Create the Crossfilter, and then create the dimensions.
        var content = Ember.get(this, 'content');

        // Checks whether we have a defined controller, and/or no content.
        var hasDefinedCrossfilter   = !!this._crossfilter,
            hasNoContent            = !content.length;

        // If we don't want have any content yet, or a defined Crossfilter, then either
        // the content hasn't been loaded yet, or we've already created the Crossfilter.
        if (hasNoContent || hasDefinedCrossfilter) {
            return false;
        }

        // Remove the observer because we don't want to keep triggering this method when
        // the content updates.
        Ember.removeObserver(this, 'content.length', this, '_createCrossfilter');

        // Create the Crossfilter and its related dimensions.
        this._crossfilter = crossfilter(content);
        this._createDimensions();

        if (Ember.get(this, 'sort.sortProperty')) {

            // Gather the details for the sorting.
            var sortProperty    = Ember.get(this, 'sort.sortProperty'),
                sortAscending   = Ember.get(this, 'sort.isAscending');

            // If we have a sort.sortProperty then we can sort the content straight away.
            Ember.set(this, 'content', this._sortedContent(content, sortProperty, sortAscending));

        }

        return true;

    },

    /**
     * Update the content in the controller against the applied filters.
     * @param map
     * @return {void}
     * @private
     */
    _updateContent: function(map) {

        // Find the defined dimension name, and begin the timing.
        var start       = new Date().getTime(),
            dimension   = this['_dimension%@'.fmt(map.dimension.capitalize())];

        switch (map.method) {

            // Use the jQuery inArray method if we've defined a filterInArray.
            case ('filterInArray')  : this._setFilterInArray(map, dimension); break;

            // Invoked when we're handling a filterRange dimension.
            case ('filterRangeMin')  : this._setFilterRangeMin(map, dimension); break;
            case ('filterRangeMax')  : this._setFilterRangeMax(map, dimension); break;

            // We need to apply a special callback if we're dealing with a filterFunction.
            case ('filterFunction') : this._setFilterFunction(map, dimension); break;

            // Otherwise we can use the old-fashioned Crossfilter method.
            default                 : dimension[map.method](map.value); break;

        }

        // Update the "content" array to reflect the new changes.
        this._applyContentChanges();

        if (this.allowDebugging) {
            // Used for debugging purposes.
            Ember.debug('Filtering: %@ millisecond(s)'.fmt(new Date().getTime() - start));
        }

    },

    /**
     * @method _applyContentChanges
     * Updates the content array based on the applied filters.
     * @return {void}
     * @private
     */
    _applyContentChanges: function() {

        // Gather the default dimension, and apply the default dimension on the primary key.
        var defaultDimension    = Ember.get(this, '_dimensionId'),
            content             = defaultDimension.filterAll().top(Infinity);

        if (Ember.get(this, 'sort.sortProperty')) {
            // Sort the content if the user has defined the `sort` object.
            content = this._sortedContent(content, Ember.get(this, 'sort.sortProperty'), Ember.get(this, 'sort.isAscending'));
        }

        // Finally we can update the content of the controller.
        Ember.set(this, 'content', content);

    },

    /**
     * @method _createDimensions
     * Create the defined dimensions from the controller.
     * @return {void}
     * @private
     */
    _createDimensions: function() {

        /**
         * @method defineProperty
         * Wrapper for the Object.defineProperty, as all of our defined dimensions will
         * be similar in their construction.
         * @param name
         * @param property
         * @return {void}
         */
        var defineProperty = function defineProperty(name, property) {

            if (this[name]) {
                // We've already defined this dimension (probably a filterRange).
                return;
            }

            // Define the property using the JS 1.8.5 way.
            Object.defineProperty(this, name, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: this._crossfilter.dimension(function(d) {
                    return d[property];
                })
            });

        };

        // Define our default dimension, which is the primary key of the collection (id).
        defineProperty.apply(this, ['_dimensionId', 'id']);

        for (var filter in this.filterMap) {

            if (!this.filterMap.hasOwnProperty(filter)) {
                continue;
            }

            // Add the name property to the filterMap method for using in setFilterRangeMin/setFilterRangeMax.
            this.filterMap[filter].name = filter;

            // Reduce this iteration to a simpler variable.
            filter = this.filterMap[filter];

            // Define the value on the `filterMap`.
            filter.value    = null;

            Ember.set(filter, 'active', false);

            if (filter.method === 'filterInArray') {
                Ember.set(filter, 'active', []);
                // We need to apply some special behaviour if it's a `filterInArray`.
                this._createFilterInArray(filter);
            }

            // Define the defined dimension in the controller.
            var name = '_dimension%@'.fmt(filter.dimension.capitalize());
            defineProperty.apply(this, [name, filter.property]);

        }

    },

    /**
     * @method _createFilterInArray
     * @param map {Object}
     * Responsible for setting up the `filterInArray` methods by attaching a bitwise operator
     * to each model.
     * @private
     */
    _createFilterInArray: function(map) {
        
        var start = new Date().getTime();

        // Initialise all of the variables, and find a unique list of the properties
        // in the models for this property.
        var allProperties   = this.mapProperty(map.property),
            properties      = [].concat.apply([], allProperties).uniq(),
            propertyName    = map.property,
            propertiesMap   = {},
            totalBitwise    = 0,
            currentIndex    = 0;

        // Loop through all of the unique properties from the controller's models.
        for (var uniquePropertyIndex in properties) {

            if (!properties.hasOwnProperty(uniquePropertyIndex)) {
                // Don't continue if it's not in the immediate prototype.
                continue;
            }

            // Otherwise we can assign a unique bitwise to this property, and increment
            // the total bitwise.
            var propertyBitwise = (1 << currentIndex++);
            totalBitwise ^= propertyBitwise;

            // Finally we can define the property's bitwise, and place it into a convenient object.
            propertiesMap[properties[uniquePropertyIndex]] = propertyBitwise;
        }

        // Set the items on the relevant `filterMap`.
        map.property        = '__ecBitwise%@'.fmt(map.name.capitalize());
        map.value           = 0;
        map._totalBitwise   = totalBitwise;
        map._mapProperties  = propertiesMap;

        var content         = Ember.get(this, 'content');

        // Iterate over all of the models in the current controller.
        for (var modelIndex = 0, numModels = Ember.get(this, 'content.length'); modelIndex <= numModels; modelIndex++) {

            // Find the model based on the current `modelIndex`.
            var model = content.objectAt(modelIndex);

            if (!model) {
                // If we don't have a model, then we can't continue.
                continue;
            }

            // Find the desired properties for this model, and initialise its bitwise.
            var propertiesList  = Ember.get(model, propertyName),
                itemBitwise     = 0;

            // Loop through each of the individual properties defined in this model, based on the property
            // we care about from the `filterMap`.
            for (var propertyIndex = 0, numItems = propertiesList.length; propertyIndex <= numItems; propertyIndex++) {

                // Find the actual value of the property.
                var propertyValue = propertiesList[propertyIndex];
    
                if (!propertyValue) {
                    // If it's empty then we don't want it.
                    continue;
                }

                // Otherwise we can incrementally calculate this model's bitwise based on
                // the properties it has.
                itemBitwise ^= map._mapProperties[propertyValue];

            }

            // Finally we can set the __ecBitwise* property on the model for later reference.
            Object.defineProperty(model, map.property, {
                enumerable: false,
                configurable: true,
                writable: false,
                value: itemBitwise
            });

        }

        if (this.allowDebugging) {
            // Calculate how long it took to create this bitwise stuff.
            Ember.debug('Properties: %@ millisecond(s)'.fmt(new Date().getTime() - start));
        }
    
    },

    /**
     * @method _sortedContent
     * @param content {Array}
     * @param property {String}
     * @param isAscending {Boolean}
     * @return {String}
     * @private
     */
    _sortedContent: function(content, property, isAscending) {

        // Initialise the sorting using Crossfilter's `quicksort`.
        var sortAlgorithm   = crossfilter.quicksort.by(function(d) { return d[property]; });

        // Sort the content using Crossfilter.
        var sorted = sortAlgorithm(content, 0, content.length);

        if (!isAscending) {
            // If we want it in descending order, then we need to reverse the array.
            sorted = sorted.reverse();
        }

        return sorted;

    },

    /**
     * @method _setFilterInArray
     * @param map
     * @param dimension
     * Implement a missing Crossfilter method for checking the inArray, although
     * if you have a small array, then you might be better off using bitwise
     * against the filterFunction method.
     * @return {void}
     * @private
     */
    _setFilterInArray: function(map, dimension) {

        if (map.boolean === 'and') {

            dimension.filterFunction(function(d) {

                if (map.value === 0) {
                    // If the value is zero, then we'll return `true` so that
                    // no items get removed using this filter.
                    return true;
                }

                var hasAllValues = true;

                // Loop through ALL of the values set on this filter.
                map.value.forEach(function(value) {

                    // ...And ensure that each one is in the model.
                    if ((d & value) === 0) {

                        // If not, then it fails the AND boolean.
                        hasAllValues = false;
                        return false;

                    }

                });

                // Whether or not this model has all of the items we're after.
                return hasAllValues;

            });

            return;

        }

        dimension.filterFunction(function(d) {

            // If the value is zero, then we'll return `true` so that
            // no items get removed using this filter.
            if (map.value === 0) {
                return true;
            }

            // We can then perform a simple bitwise calculation.
            return map.value & d;

        });

    },

    /**
     * @method _setFilterFunction
     * @param map
     * @param dimension
     * Although the filterFunction is similar to filterRange, filterExact, etc... we
     * need to invoke a user callback in order to calculate it. For this we use
     * convention over configuration.
     * @private
     */
    _setFilterFunction: function(map, dimension) {

        if (map.value === false) {
            // Remove the custom filter.
            dimension.filterAll();
            return;
        }

        var methodName = '_apply%@'.fmt(map.name.capitalize());
        Ember.assert('Crossfilter `filterFunction` expects a callback named `%@`.'.fmt(methodName), !!Ember.canInvoke(this, methodName));

        var controller = this;
        dimension.filterFunction(function(d) {
            return controller[methodName].apply(controller, [d]);
        });

    },

    /**
     * @method _setFilterRangeMin
     * @param map
     * @param dimension
     * Checks the corresponding dimension for the minimum value, and then continues to create
     * the array for the filterRange.
     * @private
     */
    _setFilterRangeMin: function(map, dimension) {

        var minName = map.name.replace('min', 'max');

        // Assert that we can find the opposite dimension.
        Ember.assert('You must specify define the `max` dimension for %@'.fmt(map.name), !!this.filterMap[minName]);

        // Apply the filter using the existing maximum value, if it exists.
        var maxValue = this.filterMap[minName].value;
        dimension.filterRange([map.value || -Infinity, maxValue || Infinity]);

    },

    /**
     * @method _setFilterRangeMax
     * @param map
     * @param dimension
     * Checks the corresponding dimension for the maximum value, and then continues to create
     * the array for the filterRange.
     * @private
     */
    _setFilterRangeMax: function(map, dimension) {

        var maxName = map.name.replace('max', 'min');

        // Assert that we can find the opposite dimension.
        Ember.assert('You must specify define the `min` dimension for %@'.fmt(map.name), !!this.filterMap[maxName]);

        // Apply the filter using the existing minimum value, if it exists.
        var minValue = this.filterMap[maxName].value;
        dimension.filterRange([minValue || -Infinity, map.value || Infinity]);

    }

});