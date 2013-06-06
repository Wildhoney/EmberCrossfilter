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
        colour: { property: 'colours', dimension: 'colour', method: 'filterInArray' },
        minAge: { property: 'age', dimension: 'age', method: 'filterRangeMin' },
        maxAge: { property: 'age', dimension: 'age', method: 'filterRangeMax' },
        name:   { property: 'name', dimension: 'name', method: 'filterExact' },
        isCute: { property: 'cuteness', dimension: 'cuteness', method: 'filterFunction' }
    },

    /**
     * Callback for the isCute filterFunction.
     * @param dimension {String|Array|Number}
     * @return {Boolean}
     * @private
     */
    _applyCuteness: function(dimension) {
        return dimension > 9;
    },

    /**
     * @method _getCats
     * @return {Array}
     * @private
     */
   _getCats: function() {

       return [
           { id: 1, name: 'Cecil', age: 4, colours: ['black', 'white', 'beige'], cuteness: 11 },
           { id: 2, name: 'Boris', age: 9, colours: ['black', 'white'], cuteness: 5 },
           { id: 3, name: 'Irina', age: 6, colours: ['ginger'], cuteness: 6 },
           { id: 4, name: 'Jimmy', age: 12, colours: ['black'], cuteness: 3 }
       ];

   }

});