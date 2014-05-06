(function($window, $ember) {

    /**
     * @module EmberCrossfilter
     * @class EmberCrossfilter
     * @type $ember.Mixin
     * Responsible for converting the loaded content into a Crossfilter object.
     */
    $window.EmberCrossfilter = $ember.Mixin.create({

        /**
         * @property _crossfilter
         * @type {Object}
         * @private
         */
        _crossfilter: null,

        /**
         * @property _deletedModels
         * @type {Array}
         * Holds a list of models that have been deleted.
         * @private
         */
        _deletedModels: [],

        /**
         * @property allowTiming
         * @type {Boolean}
         * Can be overridden by the class to allow for timing details to be output.
         */
        allowDebugging: false,

        /**
         * @property actions
         * @type {Object}
         */
        actions: {

            /**
             * @method clearAllFilters
             * Clears all of the filters that are currently active.
             * @return {void}
             */
            clearAllFilters: function clearAllFilters() {

                var start = new $window.Date().getTime();

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
                    $ember.set(map, 'active', false);
                    map.value = null;

                    if (this.isBooleanFilter(map)) {
                        // If we're dealing with a `filterAnd`/`filterOr`, then its default is 0.
                        map.value = 0;
                    }

                }

                // Update the changes with all of the filters removed.
                this._applyContentChanges();

                if (this.allowDebugging) {
                    // Used for debugging purposes.
                    $ember.debug('Clearing All: %@ millisecond(s)'.fmt(new $window.Date().getTime() - start));
                }

            },

            /**
             * @method addRecord
             * @param record {Object}
             * Adds a record to the Crossfilter.
             * @returns {Boolean}
             */
            addRecord: function addRecord(record) {
                this._crossfilter.add([record]);
                this._applyContentChanges();
                return true;
            },

            /**
             * @method addRecords
             * @param records {Array}
             * Wrapper method for adding many records to the Crossfilter.
             * @return {Number}
             */
            addRecords: function addRecords(records) {

                var added = 0;

                if (!Array.isArray(records)) {
                    console.error('You must pass an array of records: use `addRecord` instead!');
                    return 0;
                }

                // Iterate over all of the records and add each one individually.
                for (var index = 0, count = records.length; index <= count; index++) {

                    if (!records.hasOwnProperty(index)) {
                        continue;
                    }

                    // Add each record we come across!
                    var record = records[index];
                    this.send('addRecord', record);
                    added++;

                }

                return added;

            },

            /**
             * @method deleteRecord
             * @param record {Object}
             * Deletes a record from the Crossfilter.
             * @returns {Boolean}
             */
            deleteRecord: function addRecord(record) {
                this._deletedModels.push(record);
                this._applyContentChanges();
                return true;
            },

            /**
             * @method deleteRecords
             * @param records {Array}
             * Wrapper method for deleting items from the Crossfilter.
             * @return {Number}
             */
            deleteRecords: function deleteRecords(records) {

                if (!Array.isArray(records)) {
                    console.error('You must pass an array of records: use `deleteRecord` instead!');
                    return 0;
                }

                // Iterate over all of the records and delete each one individually.
                for (var index = 0, count = records.length; index <= count; index++) {

                    if (!records.hasOwnProperty(index)) {
                        continue;
                    }

                    // Remove each record we come across!
                    var record = records[index];
                    this.deleteRecord(record);

                }

                return records.length;

            },

            /**
             * @method sortContent
             * Sorts the content based on the property, and whether it should be ascending/descending.
             * @param property {String}
             * @param isAscending {Boolean}
             * @return {void}
             */
            sortContent: function sortContent(property, isAscending) {

                // Sort the content and then place it into the content array.
                var content = this._sortedContent($ember.get(this, 'content'), property, isAscending),
                    start   = new $window.Date().getTime();

                $ember.set(this, 'content', content);

                // Change the controller's variables so that you can see what's active.
                $ember.assert('In order to sort you must have a `sort` object defined.', !!$ember.get(this, 'sort'));
                $ember.assert('You must define `sortProperty` in your `sort` object.', !!$ember.get(this, 'sort.sortProperty'));
                $ember.set(this, 'sort.sortProperty', property);
                $ember.set(this, 'sort.isAscending', isAscending);

                // Notify that we've rearranged the content, otherwise there will be no update.
                this.notifyPropertyChange('content');

                if (this.allowDebugging) {
                    // Debugging information.
                    $ember.debug('Sorting: %@ millisecond(s)'.fmt(new $window.Date().getTime() - start));
                }

            },

        },

        /**
         * @method init
         * Invoked when the controller is instantiated.
         * @constructor
         */
        init: function init() {

            this._super();

            // Add the observer to create the Crossfilter when we have some content.
            $ember.addObserver(this, 'content.length', this, '_createCrossfilter');

            // Create the Crossfilter.
            this._createCrossfilter();

        },

        /**
         * Determines if a particular filter is active or not.
         * @param key {String}
         * @param value {String|Number}
         * @return {Boolean}
         */
        isActiveFilter: function isActiveFilter(key, value) {

            // Find the relevant `filterMap`.
            var map = this.filterMap[key];

            // If we're dealing with a `filterAnd`/`filterOr`, then we need to perform a
            // small calculation on it.
            if (this.isBooleanFilter(map)) {

                // Gather the bitwise value.
                var bitwiseValue = map._mapProperties[value];

                if (this.getBooleanType(map) === 'or') {
                    return Boolean((map.value & bitwiseValue));
                }

                return $.inArray(bitwiseValue, map.value) !== -1;

            }

            // Otherwise the `active` property will tell us.
            return $ember.get(map, 'active') === true;

        },

        /**
         * @method isBooleanFilter
         * @param map {Object}
         * @return {Boolean}
         */
        isBooleanFilter: function isBooleanFilter(map) {
            return (map.method === 'filterOr' || map.method === 'filterAnd');
        },

        /**
         * @method getBooleanType
         * @param map {Object}
         * @return {String}
         */
        getBooleanType: function getBooleanType(map) {
            return (map.method === 'filterOr') ? 'or' : 'and';
        },

        /**
         * @method addFilter
         * @param key
         * @param value
         * Applies a filter to one of our pre-defined dimensions.
         * @return {void}
         */
        addFilter: function addFilter(key, value) {

            // Find the map we're referencing by its name, and extract its method.
            var map = this.filterMap[key];

            if (!this.isBooleanFilter(map)) {

                // If we're dealing with a native Crossfilter method then we just need
                // to set the value, and enable the `active` property.
                map.value = value;
                $ember.set(map, 'active', true);

            } else {

                // Otherwise we're dealing with a `filterAnd`/`filterOr`.
                // Firstly we need to push the value into the list of `active` elements,
                // and ensure it's unique.

                map.active.pushObject(value);
                map.active = map.active.uniq();

                if (this.getBooleanType(map) === 'or') {

                    // If the boolean is "OR" then we need to add the bitwise.
                    map.value |= map._mapProperties[value];

                } else {

                    if (!$ember.isArray(map.value)) {
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
        removeFilter: function removeFilter(key, value) {

            // Find the `filterMap` that relates to this key.
            var map = this.filterMap[key];

            if (!this.isBooleanFilter(map)) {

                // If we're not dealing with a `filterAnd`/`filterOr` then we can
                // set its value to false, and it's `active` as well.
                map.value = false;
                $ember.set(map, 'active', false);

            }

            if (this.isBooleanFilter(map)) {

                // Otherwise we'll need to take the value out of the list
                // of active values, and ensure it's unique.
                map.active.removeObject(value);
                map.active = map.active.uniq();

                if (this.getBooleanType(map) === 'or') {

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
         * @method top
         * Helper method to find the highest value.
         * @param property {String}
         * @param count {Number}
         * @return {Number|String}
         */
        top: function top(property, count) {
            return this._topBottom(property, count, 'top');
        },

        /**
         * @method bottom
         * Helper method to find the lowest value.
         * @param property {String}
         * @param count {Number}
         * @return {Number|String}
         */
        bottom: function bottom(property, count) {
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
        _topBottom: function _topBottom(key, count, crossfilterMethod) {

            // Assert that we have a `filterMap` by this key.
            $ember.assert('Dimension with key "%@" is not defined.'.fmt(key), !!this.filterMap[key]);

            // Find the map and the related dimension.
            var map         = this.filterMap[key],
                dimension   = '_dimension%@'.fmt(map.dimension.capitalize());

            console.log(this.get('_dimensionCuteness'));

            // Use Crossfilter method to find the top/bottom.
            return this[dimension][crossfilterMethod](count || 1)[0];

        },

        /**
         * @method _createCrossfilter
         * Creates the Crossfilter from the content.
         * @return {Boolean}
         * @private
         */
        _createCrossfilter: function _createCrossfilter() {

            // Assert that we have the `filterMap` property for configuring EmberCrossfilter.
            $ember.assert('Controller implements EmberCrossfilter but `filterMap` has not been specified.', !!this.filterMap);

            // Create the Crossfilter, and then create the dimensions.
            var content = $ember.get(this, 'content');

            // Checks whether we have a defined controller, and/or no content.
            var hasDefinedCrossfilter   = !!this._crossfilter,
                hasNoContent            = !$ember.get(this, 'content.length');

            // If we don't want have any content yet, or a defined Crossfilter, then either
            // the content hasn't been loaded yet, or we've already created the Crossfilter.
            if (hasNoContent || hasDefinedCrossfilter) {
                return false;
            }

            // Remove the observer because we don't want to keep triggering this method when
            // the content updates.
            $ember.removeObserver(this, 'content.length', this, '_createCrossfilter');

            // Create the Crossfilter and its related dimensions.
            this._crossfilter = $window.crossfilter(content);
            this._createDimensions();

            if ($ember.get(this, 'sort.sortProperty')) {

                // Gather the details for the sorting.
                var sortProperty    = $ember.get(this, 'sort.sortProperty'),
                    sortAscending   = $ember.get(this, 'sort.isAscending');

                // If we have a sort.sortProperty then we can sort the content straight away.
                $ember.set(this, 'content', this._sortedContent(content, sortProperty, sortAscending));

            }

            return true;

        },

        /**
         * Update the content in the controller against the applied filters.
         * @param map
         * @return {void}
         * @private
         */
        _updateContent: function _updateContent(map) {

            // Find the defined dimension name, and begin the timing.
            var start       = new $window.Date().getTime(),
                dimension   = this['_dimension%@'.fmt(map.dimension.capitalize())];

            switch (map.method) {

                // Use the jQuery inArray method if we've defined a `filterAnd`/`filterOr`.
                case ('filterOr'): case ('filterAnd'): this._setFilterBoolean(map, dimension); break;

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
                $ember.debug('Filtering: %@ millisecond(s)'.fmt(new $window.Date().getTime() - start));
            }

        },

        /**
         * @method _applyContentChanges
         * Updates the content array based on the applied filters. Any changes to the Crossfilter should
         * mean invoke this function!
         * @return {void}
         * @private
         */
        _applyContentChanges: function _applyContentChanges() {

            // Gather the default dimension, and apply the default dimension on the primary key.
            var defaultDimension    = $ember.get(this, '_dimensionDefault'),
                deletedModelIds     = this._deletedModels.map(function(model) {
                    if (typeof model === 'undefined') {
                        return false;
                    }

                    return (model[$ember.get(this, 'primaryKey') || 'id']);
                }),
                deleted             = function(primaryKey) {
                    return ($.inArray(primaryKey, deletedModelIds) === -1);
                },
                content             = defaultDimension.filterFunction(deleted).top(Infinity);

            if ($ember.get(this, 'sort.sortProperty')) {
                // Sort the content if the user has defined the `sort` object.
                content = this._sortedContent(content, $ember.get(this, 'sort.sortProperty'), $ember.get(this, 'sort.isAscending'));
            }

            // Finally we can update the content of the controller.
            $ember.set(this, 'content', content);

        },

        /**
         * @method _createDimensions
         * Create the defined dimensions from the controller.
         * @return {void}
         * @private
         */
        _createDimensions: function _createDimensions() {

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
                    enumerable      : false,
                    configurable    : false,
                    writable        : false,
                    value           : this._crossfilter.dimension(function(d) {
                        if ($ember.isNone(d[property])){

                            if ('get' in d) {
                                return d.get(property);
                            } else {
                                return null;
                            }
                        }
                        return d[property];
                      })
                    });

            };

            // Define our default dimension, which is the primary key of the collection (id).
            defineProperty.apply(this, ['_dimensionDefault', $ember.get(this, 'primaryKey') || 'id']);

            for (var map in this.filterMap) {

                if (!this.filterMap.hasOwnProperty(map)) {
                    continue;
                }

                // Add the name property to the filterMap method for using in setFilterRangeMin/setFilterRangeMax.
                this.filterMap[map].name = map;

                // Reduce this iteration to a simpler variable.
                map = this.filterMap[map];

                // Define the value on the `filterMap`.
                map.value = null;

                $ember.set(map, 'active', false);

                if (this.isBooleanFilter(map)) {

                    $ember.set(map, 'active', []);
                    // We need to apply some special behaviour if it's a `filterAnd`/`filterOr`.
                    this._createFilterBoolean(map);

                }

                // Define the defined dimension in the controller.
                var name = '_dimension%@'.fmt(map.dimension.capitalize());
                defineProperty.apply(this, [name, map.property]);

            }

        },

        /**
         * @method _createFilterBoolean
         * @param map {Object}
         * Responsible for setting up the `filterAnd`/`filterOr` methods by attaching a bitwise operator
         * to each model.
         * @private
         */
        _createFilterBoolean: function _createFilterBoolean(map) {

            var start = new $window.Date().getTime();

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

            var content         = $ember.get(this, 'content');

            // Iterate over all of the models in the current controller.
            for (var modelIndex = 0, numModels = $ember.get(this, 'content.length'); modelIndex <= numModels; modelIndex++) {

                // Find the model based on the current `modelIndex`.
                var model = content.objectAt(modelIndex);

                if (!model) {
                    // If we don't have a model, then we can't continue.
                    continue;
                }

                // Find the desired properties for this model, and initialise its bitwise.
                var propertiesList  = $ember.get(model, propertyName),
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
                $ember.debug('Properties: %@ millisecond(s)'.fmt(new $window.Date().getTime() - start));
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
        _sortedContent: function _sortedContent(content, property, isAscending) {

            // Initialise the sorting using Crossfilter's `quicksort`.
            var sortAlgorithm   = crossfilter.quicksort.by(function(d) {
                         if ($ember.isNone(d[property])){

                            if ('get' in d) {
                                return d.get(property);
                            } else {
                                return null;
                            }
                        }
                        return d[property];
              });



            // Sort the content using Crossfilter.
            var sorted = sortAlgorithm(content, 0, $ember.get(content, 'length'));

            if (!isAscending) {
                // If we want it in descending order, then we need to reverse the array.
                sorted = sorted.reverse();
            }

            return sorted;

        },

        /**
         * @method _setFilterBoolean
         * @param map
         * @param dimension
         * Implement a missing Crossfilter method for checking the inArray, although
         * if you have a small array, then you might be better off using bitwise
         * against the filterFunction method.
         * @return {void}
         * @private
         */
        _setFilterBoolean: function _setFilterBoolean(map, dimension) {

            if (this.getBooleanType(map) === 'and') {

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
        _setFilterFunction: function _setFilterFunction(map, dimension) {

            var controller = this, methodName;

            if (map.value === false) {
                // Remove the custom filter.
                dimension.filterAll();
                return;
            }

            methodName = '_apply%@'.fmt(map.name.capitalize());
            $ember.assert('Crossfilter `filterFunction` expects a callback named `%@`.'.fmt(methodName), !!$ember.canInvoke(this, methodName));

            controller = this;
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
        _setFilterRangeMin: function _setFilterRangeMin(map, dimension) {

            var minName = map.name.replace('min', 'max'), maxValue;

            // Assert that we can find the opposite dimension.
            $ember.assert('You must specify define the `max` dimension for %@'.fmt(map.name), !!this.filterMap[minName]);

            // Apply the filter using the existing maximum value, if it exists.
            maxValue = this.filterMap[minName].value;
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
        _setFilterRangeMax: function _setFilterRangeMax(map, dimension) {

            var maxName = map.name.replace('max', 'min'), minValue;

            // Assert that we can find the opposite dimension.
            $ember.assert('You must specify define the `min` dimension for %@'.fmt(map.name), !!this.filterMap[maxName]);

            // Apply the filter using the existing minimum value, if it exists.
            minValue = this.filterMap[maxName].value;
            dimension.filterRange([minValue || -Infinity, map.value || Infinity]);

        }

    });

})(window, window.Ember);
