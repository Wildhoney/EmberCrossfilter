/**
 * @module App
 * @class CatsController
 * @uses App.CrossfilterMixin, App.DataMixin
 * @type Ember.ArrayController
 * @extends Ember.ArrayController
 */
App.CatsController = Ember.ArrayController.extend(EmberCrossfilter, {

    /**
     * @property model
     * @type String
     * @default "App.CatModel"
     */
    model: App.CatModel,

    /**
     * @method init
     * @return void
     */
    init: function() {

        var models = [];

        this._getCats().forEach(function(cat) {
            var model = this.model.create(cat);
            models.push(model);
        }, this);
        this.set('content', models);

        this._super();

    },

    /**
     * @property sort
     * @type {Object}
     */
    sort: { sortProperty: 'name', isAscending: false },

    /**
     * @property filterMap
     * @type {Object}
     * Configures the Crossfilter so that you can begin applying filters against
     * your dimensions.
     */
    filterMap: {
        colour:         { property: 'colours', dimension: 'colour', method: 'filterInArray', boolean: 'or' },
        country:        { property: 'country', dimension: 'country', method: 'filterInArray', boolean: 'and' },
        minAge:         { property: 'age', dimension: 'age', method: 'filterRangeMin' },
        maxAge:         { property: 'age', dimension: 'age', method: 'filterRangeMax' },
        name:           { property: 'name', dimension: 'name', method: 'filterExact' },
        partialName:    { property: 'name', dimension: 'nameRegexp', method: 'filterFunction' },
        isCute:         { property: 'cuteness', dimension: 'cuteness', method: 'filterFunction' }
    },

    /**
     * @property allowDebugging
     * @type {Boolean}
     * Enables timing information to be output.
     */
    allowDebugging: true,

    /**
     * Callback for the isCute filterFunction.
     * @param dimension {String|Array|Number}
     * @return {Boolean}
     * @private
     */
    _applyIsCute: function(dimension) {
        return dimension > 9;
    },

    /**
     * Callback for the partialName filterFunction.
     * @param dimension {String|Array|Number}
     * @return {Boolean}
     * @private
     */
    _applyPartialName: function(dimension) {
        return dimension.match(/R/i);
    },

    /**
     * @method _getCats
     * @return {Array}
     * @private
     */
   _getCats: function() {

       return [
           { id: 1, name: 'Cecil', age: 4, colours: ['black', 'white', 'beige'], country: ['Russia'], cuteness: 11 },
           { id: 2, name: 'Boris', age: 9, colours: ['black', 'white'], country: ['Italy'], cuteness: 5 },
           { id: 3, name: 'Irina', age: 6, colours: ['ginger', 'beige'], country: ['Britain', 'Russia'], cuteness: 6 },
           { id: 4, name: 'Jimmy', age: 12, colours: ['black'], country: ['Iran'], cuteness: 3 },
           { id: 5, name: 'Masha', age: 4, colours: ['brown', 'black', 'beige'], country: ['Brazil'], cuteness: 14 },
           { id: 6, name: 'Gorge', age: 6, colours: ['blue', 'grey'], country: ['Iran'], cuteness: 7 },
           { id: 7, name: 'Milly', age: 7, colours: ['black', 'white', 'ginger'], country: ['Russia', 'Britain', 'Spain'], cuteness: 8 },
           { id: 8, name: 'Honey', age: 7, colours: ['white'], country: 'Spain', cuteness: 12 },
           { id: 9, name: 'Simon', age: 15, colours: ['black', 'white', 'grey'], country: ['Britain', 'Qatar'], cuteness: 5 },
           { id: 10, name: 'Julia', age: 11, colours: ['black', 'grey', 'ginger'], country: ['Russia'], cuteness: 13 }
       ];

   }

});