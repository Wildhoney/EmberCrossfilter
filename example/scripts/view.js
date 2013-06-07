/**
 * @module App
 * @class CatsView
 * @type Ember.View
 * @extends Ember.View
 */
App.CatsView = Ember.View.extend({

    /**
     * @class Filter
     * @type Ember.View
     * @extends Ember.View
     */
    Filter: Ember.View.extend({

        /**
         * @property tagName
         * @type {String}
         * @default "a"
         */
        tagName: 'a',

        classNameBindings: ['isFilterActive:active:inactive'],

        /**
         * @method click
         * @return {void}
         */
        click: function() {

            var controller  = this.get('controller'),
                key         = this.get('key'),
                value       = this.get('value');

            if (this.get('isFilterActive')) {
                // Remove the filter if it's currently active.
                controller.removeFilter(key, value);
                return;
            }

            // Otherwise we want to apply this filter.
            controller.addFilter(key, value);

        },

        /**
         * @property isFilterActive
         * Determines whether the current filter is active by its key.
         * @return {Boolean}
         */
        isFilterActive: function() {

            var key         = this.get('key'),
                controller  = this.get('controller');

            return controller.isActiveFilter(key, this.get('value'));

        }.property('controller.content.length')

    })

});