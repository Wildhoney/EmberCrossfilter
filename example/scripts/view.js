App.CatsView = Ember.View.extend({

    Filter: Ember.View.extend({

        tagName: 'a',

        click: function() {

            var controller  = this.get('controller'),
                key         = this.get('key'),
                value       = this.get('value');

            if (this.get('isArray')) {
                var values = value.split(/,/);
                controller.addArrayFilter(key, values[0], values[1]);
            }

            controller.addFilter(key, value);

        }

    })

});