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
        this._crossfilter = crossfilter(this.get('content'));
        this._createDimensions();
    },

    /**
     * Update the content in the controller against the applied filters.
     * @param map
     * @param method
     * @return {void}
     * @private
     */
    _updateContent: function(map, method) {

        method = method || map.method;

        // Find the defined dimension name, and begin the timing.
        var start       = new Date().getTime(),
            dimension   = this.get('_dimension%@'.fmt(map.dimension.capitalize()));

        if (Ember.isNone(map.value)) {

            // Clear the dimension of any applied filter.
            dimension.filterAll();

        } else {

            switch (method) {

                // Use the jQuery inArray method if we've defined a filterInArray.
                case ('filterInArray')  : this._setFilterInArray(map, dimension); break;

                // Otherwise we can use the old-fashioned Crossfilter method.
                default                 : dimension[method](map.value); break;


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
     * @method addArrayFilter
     * Used for providing the values for a filterRange.
     * @param key
     * @param firstValue
     * @param secondValue
     */
    addArrayFilter: function(key, firstValue, secondValue) {
        this.addFilter(key, [firstValue, secondValue]);
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
     * Implement a missing Crossfilter method for checking the inArray, although
     * if you have a small array, then you might be better off using bitwise
     * against the filterFunction method.
     * @param map
     * @param dimension
     * @private
     */
    _setFilterInArray: function(map, dimension) {
        dimension.filterFunction(function(d) {
            return $.inArray(map.value, d) !== -1;
        });
    }

});