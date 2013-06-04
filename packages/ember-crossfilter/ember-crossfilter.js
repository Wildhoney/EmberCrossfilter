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
     */
    _crossfilter: null,

    /**
     * @method init
     * Invoked when the controller is instantiated.
     * @constructor
     */
    init: function() {

        this._super();

        // Assert that we have the `filterMap` property for configuring EmberCrossfilter.
        Ember.assert('Controller implements EmberCrossfilter but `filterMap` has not been specified.', !!this.filterMap);

        // Create the Crossfilter, and finally create the dimensions.
        this._crossfilter = crossfilter(this.get('content'));
        this._createDimensions();

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
            dimension   = this.get('_dimension%@'.fmt(map.dimension.capitalize()));

        if (Ember.isNone(map.value)) {

            // Clear the dimension of any applied filter.
            dimension.filterAll();

        } else {

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

        // Gather the default dimension, and apply the default dimension on the primary key.
        var defaultDimension    = this.get('_dimensionId'),
            content             = defaultDimension.filterAll().top(Infinity);

        // Used for debugging purposes.
        Ember.debug('Crossfilter Time: %@ millisecond(s)'.fmt(new Date().getTime() - start));

        // Finally we can update the content of the controller.
        this.set('content', content);

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

            // Define the defined dimension in the controller.
            var name = '_dimension%@'.fmt(filter.dimension.capitalize());
            defineProperty.apply(this, [name, filter.property]);

        }

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
     * @method clearFilter
     * Clear the any applied filters to the dimension.
     * @param key
     */
    clearFilter: function(key) {
        this.addFilter(key, null);
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
        var minValue = this.filterMap[minName].value;
        dimension.filterRange([minValue || -Infinity, map.value]);

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
        dimension.filterRange([map.value, minValue || Infinity]);

    }

});