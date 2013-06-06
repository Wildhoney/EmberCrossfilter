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
     * @property activeFilters
     * @type {Array}
     * @default Ember.A
     */
    activeFilters: Ember.A([]),

    /**
     * @method init
     * Invoked when the controller is instantiated.
     * @constructor
     */
    init: function() {

        this._super();

        // Define an empty activeFilters.
        Ember.set(this, 'activeFilters', Ember.A([]));

        // Add the observer to create the Crossfilter when we have some content.
        Ember.addObserver(this, 'content.length', this, '_createCrossfilter');

        // Create the Crossfilter.
        this._createCrossfilter();

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
        var hasDefinedCrossfilter   = !!Ember.get(this, '_crossfilter'),
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
     * @method addFilter
     * @param key
     * @param value
     * Applies a filter to one of our pre-defined dimensions.
     * @return {void}
     */
    addFilter: function(key, value) {

        // Find the map we're referencing by its name, and extract its method.
        var map     = this.filterMap[key];
        map.value   = value;

        if (Ember.isArray(value)) {
            // If we're actually dealing with an array then
            // we want to upgrade the value to an array.
            map.value = [value[0], value[1]];
        }

        // Finally we can begin to update the content in the controller.
        this._updateContent(map);

    },

    /**
     * @method removeFilter
     * @param key
     * Clear the any applied filters to the dimension.
     * @return {void}
     */
    removeFilter: function(key) {
        this.addFilter(key, null);
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

        }

        // Clear all of the active filters.
        Ember.get(this, 'activeFilters').clear();

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
     * Determines whether the current filter is active by its key.
     * @param key {String} name of the defined Crossfilter from `filterMap`.
     * @return {Boolean}
     */
    isActiveFilter: function(key) {
        return $.inArray(key, Ember.get(this, 'activeFilters')) !== -1;
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

        if (Ember.isNone(map.value) && map.method !== 'filterFunction') {

            // Remove the filter from the list of active filters.
            Ember.get(this, 'activeFilters').removeObject(map.name);

            // Clear the dimension of any applied filter.
            dimension.filterAll();

        } else {

            // Add the filter to the list of active filters.
            Ember.get(this, 'activeFilters').pushObject(map.name);

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
            this.filterMap[filter].value = null;

            // Reduce this iteration to a simpler variable.
            filter = this.filterMap[filter];

            // Define the defined dimension in the controller.
            var name = '_dimension%@'.fmt(filter.dimension.capitalize());
            defineProperty.apply(this, [name, filter.property]);

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
            // If we want it in ascending order, then we need to reverse the array.
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
     * @private
     */
    _setFilterInArray: function(map, dimension) {

        dimension.filterFunction(function(d) {
            return $.inArray(map.value, d) !== -1;
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

        var methodName = '_apply%@'.fmt(map.dimension.capitalize());
        Ember.assert('Crossfilter `filterFunction` expects a callback named `%@`.'.fmt(methodName), !!Ember.canInvoke(this, methodName));
        dimension.filterFunction(this[methodName]);

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
        dimension.filterRange([map.value, maxValue || Infinity]);

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
        dimension.filterRange([minValue || -Infinity, map.value]);

    }

});