App.CatsView = Ember.View.extend({

    Filter: Ember.View.extend({

        tagName: 'a',

        click: function() {

            var controller  = this.get('controller'),
                key         = this.get('key'),
                value       = this.get('value');

            controller.addFilter(key, value);

        }

    })

});