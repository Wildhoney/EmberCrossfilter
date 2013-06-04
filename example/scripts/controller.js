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
     * @property sortBy
     * @type {String}
     * @default "name"
     */
    sortProperty: 'name',

    /**
     * @property filterMap
     * @type {Object}
     * Configures the Crossfilter so that you can begin applying filters against
     * your dimensions.
     */
    filterMap: {
        colour:   { property: 'colours', dimension: 'colour',  method: 'filterInArray', value: null },
        age:      { property: 'age', dimension: 'age', method: 'filterRange', value: [] },
        name:     { property: 'name', dimension: 'name', method: 'filterExact', value: null  }
    },

    /**
     * @method _getCats
     * @return {Array}
     * @private
     */
   _getCats: function() {

       return [
           { id: 1, name: 'Cecil', age: 4, colours: ['black', 'white', 'beige'] },
           { id: 2, name: 'Boris', age: 9, colours: ['black', 'white'] },
           { id: 3, name: 'Irina', age: 6, colours: ['ginger'] }
       ];

   }

});