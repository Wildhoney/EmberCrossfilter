/**
 * @module App
 * @class App
 * @type Ember.Application
 */
window.App = Ember.Application.create({
    Router: Ember.Router.extend()
});

/**
 * @module App
 * @type App.Router
 * Define the cat route.
 */
App.Router.map(function() {
    this.route('cats');
});

/**
 * @module App
 * @class IndexRoute
 * @type Ember.Route
 */
App.IndexRoute = Ember.Route.extend({

    /**
     * @method redirect
     * Redirect people to the cats route.
     * @return void
     */
   redirect: function() {
       this.transitionTo('cats');
   }

});