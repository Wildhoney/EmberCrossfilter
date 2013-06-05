describe('Ember Crossfilter', function() {
    var controller;

    beforeEach(function() {

        var ArrayController = Ember.ArrayController.extend(EmberCrossfilter, {

            init: function() {
                this.set('content', [
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

            sort: { property: 'name', isAscending: true },

            _applyCuteness: function(dimension) {
                return dimension > 9;
            }

        });

        controller = ArrayController.create();

    });

    describe('Generic', function() {

        it('Can set the content array on the controller.', function() {
            expect(controller.get('content.length')).toEqual(4);
        });

        it('Can find the `filterMap` defined on the controller.', function() {
            expect(controller.get('filterMap')).toBeDefined();
        });

    });

    describe('Internals (Private Methods)', function() {

        it('Can apply default dimension.', function() {
            controller._applyContentChanges();
            expect(controller.get('content.length')).toEqual(4);
        });

        it('Can apply a specified dimension.', function() {
            var map = controller.filterMap.name;
            map.value = 'Boris';
            controller._updateContent(map);
            expect(controller.get('content.length')).toEqual(1);
        });

        it('Can sort content ascending by name.', function() {
            controller._sortedContent(controller.get('content'), 'name', true);
            expect(controller.get('content.firstObject.name')).toEqual('Boris');
        });

    });

    describe('Crossfilter', function() {

        it('Can define the necessary dimensions.', function() {
            expect(controller.get('_dimensionId')).toBeDefined();
            expect(controller.get('_dimensionColour')).toBeDefined();
            expect(controller.get('_dimensionAge')).toBeDefined();
            expect(controller.get('_dimensionName')).toBeDefined();
            expect(controller.get('_dimensionCuteness')).toBeDefined();
        });

        it('Can create a valid Crossfilter.', function() {
            expect(controller.get('_crossfilter')).toBeDefined();
            expect(controller.get('_crossfilter') instanceof Object).toBeTruthy();
        });

    });

    describe('Active Filters', function() {

        it('Can determine that the name filter is active.', function() {
            controller.addFilter('name', 'Cecil');
            expect(controller.get('activeFilters')).toEqual(['name']);
        });

        it('Can determine that the many filters are active.', function() {
            controller.addFilter('name', 'Cecil');
            controller.addFilter('minAge', 7);
            expect(controller.get('activeFilters')).toEqual(['name', 'minAge']);
        });

    });

    describe('Filtering', function() {

        it('Can filter the content for filterExact dimension.', function() {
            controller.addFilter('name', 'Boris');
            expect(controller.get('content.length')).toEqual(1);
        });

        it('Can filter the content for filterInArray dimension.', function() {
            controller.addFilter('colour', 'black');
            expect(controller.get('content.length')).toEqual(3);
        });

        it('Can filter the content for filterFunction dimension.', function() {
            controller.addFilter('isCute');
            expect(controller.get('content.length')).toEqual(1);
        });

        it('Can filter the content for filterRangeMin dimension.', function() {
            controller.addFilter('minAge', 5);
            expect(controller.get('content.length')).toEqual(3);
        });

        it('Can filter the content for filterRangeMax dimension.', function() {
            controller.addFilter('maxAge', 8);
            expect(controller.get('content.length')).toEqual(2);
        });

        it('Can clear the name filter.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('minAge', 6);
            controller.removeFilter('name');
            expect(controller.get('content.length')).toEqual(3);
        });

        it('Can clear the minAge filter.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('minAge', 100);
            controller.removeFilter('minAge');
            expect(controller.get('content.length')).toEqual(1);
        });

        it('Can clear all of the filtering.', function() {
            controller.addFilter('name', 'Boris');
            controller.addFilter('maxAge', 8);
            controller.clearAllFilters();
            expect(controller.get('content.length')).toEqual(4);
        });

    });

    describe('Sorting', function() {

        it('Can sort content ascending by name.', function() {
            controller.sortContent('name', true);
            expect(controller.get('content.firstObject.name')).toEqual('Boris');
        });

        it('Can sort content descending by name.', function() {
            controller.sortContent('name', false);
            expect(controller.get('content.firstObject.name')).toEqual('Jimmy');
        });

        it('Can sort content ascending by cuteness level.', function() {
            controller.sortContent('cuteness', true);
            expect(controller.get('content.firstObject.name')).toEqual('Jimmy');
        });

        it('Can sort content descending by cuteness level.', function() {
            controller.sortContent('cuteness', false);
            expect(controller.get('content.firstObject.name')).toEqual('Cecil');
        });

    });

});