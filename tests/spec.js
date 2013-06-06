describe('Ember Crossfilter', function() {
    var controller;

    beforeEach(function() {

        var ArrayController = Ember.ArrayController.extend(EmberCrossfilter, {

            init: function() {
                Ember.set(this, 'content', [
                    { id: 1, name: 'Cecil', age: 4, colours: ['black', 'white', 'beige'], cuteness: 11 },
                    { id: 2, name: 'Boris', age: 9, colours: ['black', 'white'], cuteness: 5 },
                    { id: 3, name: 'Irina', age: 6, colours: ['ginger'], cuteness: 6 },
                    { id: 4, name: 'Jimmy', age: 12, colours: ['black'], cuteness: 3 }
                ]);
                this._super();
            },

            filterMap: {
                colour: { property: 'colours', dimension: 'colour', method: 'filterInArray' },
                minAge: { property: 'age', dimension: 'age', method: 'filterRangeMin' },
                maxAge: { property: 'age', dimension: 'age', method: 'filterRangeMax' },
                name:   { property: 'name', dimension: 'name', method: 'filterExact' },
                isCute: { property: 'cuteness', dimension: 'cuteness', method: 'filterFunction' }
            },

            sort: { sortProperty: 'name', isAscending: true },

            _applyCuteness: function(dimension) {
                return dimension > 9;
            }

        });

        controller = ArrayController.create();

    });

    describe('Generic', function() {

        it('Can set the content array on the controller.', function() {
            expect(Ember.get(controller, 'content.length')).toEqual(4);
        });

        it('Can find the `filterMap` defined on the controller.', function() {
            expect(Ember.get(controller, 'filterMap')).toBeDefined();
        });

    });

    describe('Internals (Private Methods)', function() {

        it('Can apply default dimension.', function() {
            controller._applyContentChanges();
            expect(Ember.get(controller, 'content.length')).toEqual(4);
        });

        it('Can apply a specified dimension.', function() {
            var map = controller.filterMap.name;
            map.value = 'Boris';
            controller._updateContent(map);
            expect(Ember.get(controller, 'content.length')).toEqual(1);
        });

        it('Can sort content ascending by name.', function() {
            controller._sortedContent(Ember.get(controller, 'content'), 'name', true);
            expect(Ember.get(controller, 'content.firstObject.name')).toEqual('Boris');
        });

    });

    describe('Crossfilter', function() {

        it('Can define the necessary dimensions.', function() {
            expect(Ember.get(controller, '_dimensionId')).toBeDefined();
            expect(Ember.get(controller, '_dimensionColour')).toBeDefined();
            expect(Ember.get(controller, '_dimensionAge')).toBeDefined();
            expect(Ember.get(controller, '_dimensionName')).toBeDefined();
            expect(Ember.get(controller, '_dimensionCuteness')).toBeDefined();
        });

        it('Can create a valid Crossfilter.', function() {
            expect(Ember.get(controller, '_crossfilter')).toBeDefined();
            expect(Ember.get(controller, '_crossfilter') instanceof Object).toBeTruthy();
        });

    });

    describe('Active Filters', function() {

        it('Can determine that the minAge filter is active.', function() {
            controller.addFilter('minAge', 4);
            expect(Ember.get(controller, 'activeFilters')).toEqual(['minAge']);
        });

        it('Can determine that the name filter is not active.', function() {
            controller.addFilter('colour', 'black');
            expect(Ember.get(controller, 'activeFilters')).toEqual(['colour']);
        });

        it('Can determine that the name filter is active via helper method.', function() {
            controller.addFilter('name', 'Boris');
            expect(controller.isActiveFilter('name')).toBeTruthy();
        });

        it('Can determine that the minAge filter is not active via helper method.', function() {
            controller.addFilter('name', 'Boris');
            expect(controller.isActiveFilter('minAge')).toBeFalsy();
        });

        it('Can determine that the many filters are active.', function() {
            controller.addFilter('name', 'Cecil');
            controller.addFilter('minAge', 7);
            expect(Ember.get(controller, 'activeFilters')).toEqual(['name', 'minAge']);
        });

    });

    describe('Filtering', function() {

        it('Can filter the content for filterExact dimension.', function() {
            controller.addFilter('name', 'Boris');
            expect(Ember.get(controller, 'content.length')).toEqual(1);
        });

        it('Can filter the content for filterInArray dimension.', function() {
            controller.addFilter('colour', 'black');
            expect(Ember.get(controller, 'content.length')).toEqual(3);
        });

        it('Can filter the content for filterFunction dimension.', function() {
            controller.addFilter('isCute');
            expect(Ember.get(controller, 'content.length')).toEqual(1);
        });

        it('Can filter the content for filterRangeMin dimension.', function() {
            controller.addFilter('minAge', 5);
            expect(Ember.get(controller, 'content.length')).toEqual(3);
        });

        it('Can filter the content for filterRangeMax dimension.', function() {
            controller.addFilter('maxAge', 8);
            expect(Ember.get(controller, 'content.length')).toEqual(2);
        });

        it('Can clear the name filter.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('minAge', 6);
            controller.removeFilter('name');
            expect(Ember.get(controller, 'content.length')).toEqual(3);
        });

        it('Can clear the minAge filter.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('minAge', 100);
            controller.removeFilter('minAge');
            expect(Ember.get(controller, 'content.length')).toEqual(1);
        });

        it('Can clear all of the filtering.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('maxAge', 8);
            controller.clearAllFilters();
            expect(Ember.get(controller, 'content.length')).toEqual(4);
        });

    });

    describe('Sorting', function() {

        it('Can sort content ascending by name.', function() {
            controller.sortContent('name', true);
            expect(Ember.get(controller, 'content.firstObject.name')).toEqual('Boris');
        });

        it('Can sort content descending by name.', function() {
            controller.sortContent('name', false);
            expect(Ember.get(controller, 'content.firstObject.name')).toEqual('Jimmy');
        });

        it('Can sort content ascending by cuteness level.', function() {
            controller.sortContent('cuteness', true);
            expect(Ember.get(controller, 'content.firstObject.name')).toEqual('Jimmy');
        });

        it('Can sort content descending by cuteness level.', function() {
            controller.sortContent('cuteness', false);
            expect(Ember.get(controller, 'content.firstObject.name')).toEqual('Cecil');
        });

    });

});