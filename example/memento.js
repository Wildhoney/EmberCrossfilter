Ember.Memento = Ember.Mixin.create({

    // holds all history items
    _memento: [],

    /**
    * current history index; the item in _memento at the _mementoIndex
    * represents the past, everything on the right of
    * _mementoIndex represents the future
    */
    _mementoIndex: -1,

    undoCount: function() {
        return this.get('_mementoIndex') + 1;
    }.property('_mementoIndex').cacheable(),

    redoCount: function() {
        var length = this.getPath('_memento.length');
        var mementoIndex = this.get('_mementoIndex');
        return length - mementoIndex - 1;
    }.property('_mementoIndex', '_memento.length').cacheable(),

    canUndo: function() {
        return this.get('undoCount') > 0;
    }.property('undoCount').cacheable(),

    canRedo: function() {
        return this.get('redoCount') > 0;
    }.property('redoCount').cacheable(),

    _mementoSizeChanged: function() {
        this._updateMemento();
    }.observes('mementoSize'),

    _updateMemento: function() {
        var mementoSize = this.get('mementoSize');
        if (mementoSize && mementoSize > 0) {
            this.clearHistory(mementoSize);
        }
    },

    _addHistory: function(history) {
        /**
         * since _addHistory is invoked on every property change,
         * we have to check if the property value is set from within
         * a "undo" or "redo", and if so, we don't add another history item
         */
        if (!this.get('_isUndo')) {
            // Since we are adding a new history, clear future first
            this._clearFuture();

            // add new history item and increase current history index
            this.get('_memento').pushObject(history);
            this.incrementProperty('_mementoIndex');

            this._updateMemento();
        }
    },

    clearHistory: function(count) {
        // clear everything if there is no count
        if (!count) {
            this.get('_memento').clear();
            this.set('_mementoIndex', -1);
            return;
        }

        // ignore negative count
        if (count <= 0) {
            return;
        }

        // clear the future
        this._clearFuture();

        // clear history except last "count" items
        var mementoIndex = this.get('_mementoIndex');
        count = Math.min(count, mementoIndex + 1);
        var removeCount = mementoIndex - count + 1;
        this.get('_memento').replace(0, removeCount);
        this.set('_mementoIndex', count - 1);
    },

    _clearFuture: function() {
        var mementoIndex = this.get('_mementoIndex');
        var lastIndex = this.get('_memento.length') - 1;
        var diff = lastIndex - mementoIndex;
        if (mementoIndex !== lastIndex && diff >= 0) {
            this.get('_memento').replace(mementoIndex + 1, diff);
        }
    },

    updateProperties: function(hash) {
        var keys = Ember.keys(hash);
        var currentValues = this.getProperties(keys);
        this.set('_isUpdateProperties', true);
        this.setProperties(hash);
        this.set('_isUpdateProperties', false);

        var obj = this;
        this._addHistory({
            undoDescription: 'set keys %@ to "%@"'.fmt(keys, JSON.stringify(currentValues)),
            redoDescription: 'set keys %@ to %@'.fmt(keys, JSON.stringify(hash)),
            undo: function() {
                obj.setProperties(currentValues);
            },
            redo: function() {
                obj.setProperties(hash);
            }
        });
    },

    /**
     * Go back in time
     */
    undo: function() {
        this.set('_isUndo', true);
        // check if we can go back in time
        var mementoIndex = this.get('_mementoIndex');
        if (mementoIndex >= 0) {
            var historyItem = this.get('_memento').objectAt(mementoIndex);
            historyItem.undo();
            this.decrementProperty('_mementoIndex');
        }
        this.set('_isUndo', false);
    },

    /**
     * Redo a step in history
     */
    redo: function() {
        this.set('_isUndo', true);
        // check if we can do a step into future
        var mementoIndex = this.get('_mementoIndex');
        var historyLength = this.getPath('_memento.length');
        if (mementoIndex < historyLength - 1) {
            mementoIndex = this.incrementProperty('_mementoIndex');
            var historyItem = this.get('_memento').objectAt(mementoIndex);
            historyItem.redo();
        }
        this.set('_isUndo', false);
    },

    init: function() {
        this.set('_memento', []);
        this.set('_mementoIndex', -1);

        // iterate over all mementoProperties and add observers
        var props = this.get('mementoProperties');
        props.forEach(function(item) {
            var prop = Ember.get(this, item);

            Ember.addBeforeObserver(this, item, this, '_beforePropertyChange');
            Ember.addObserver(this, item, this, '_propertyChanged');

            // check if the property is an array
            if (Ember.typeOf(prop) === 'array') {
                prop.addArrayObserver(this);
            }
        },
        this);
    },

    // temporarily save the value which will be changed
    _beforePropertyChange: function(obj, propName) {
        var val = Ember.get(obj, propName);
        this.set('_beforeValue', val);

        // check if the property is an array
        if (Ember.typeOf(val) === 'array') {
            val.removeArrayObserver(this);
        }
    },

    // invoked when a "normal" property has been changed
    _propertyChanged: function(obj, propName) {
        var val = Ember.get(obj, propName);

        // check if the property is an array
        if (Ember.typeOf(val) === 'array') {
            val.addArrayObserver(this);
        }

        if (this.get('_isUpdateProperties')) {
            return;
        }

        var beforeValue = Ember.get(this, '_beforeValue');
        this._addHistory({
            undoDescription: 'set %@ to "%@"'.fmt(propName, beforeValue),
            redoDescription: 'set %@ to %@'.fmt(propName, val),
            undo: function() {
                Ember.set(obj, propName, beforeValue);
            },
            redo: function() {
                Ember.set(obj, propName, val);
            }
        });
    },

    arrayWillChange: function(array, startIndex, rmCount, addCount) {
        // check if some elements will be removed from array
        if (rmCount !== 0 && !this.get('_isUpdateProperties')) {
            var elements = array.slice(startIndex, startIndex + rmCount);
            this._addHistory({
                undoDescription: 'add %@ elements [%@] at %@'.fmt(rmCount, elements, startIndex),
                redoDescription: 'remove %@ elements [%@] at %@'.fmt(rmCount, elements, startIndex),
                undo: function() {
                    array.replace(startIndex, 0, elements);
                },
                redo: function() {
                    array.replace(startIndex, rmCount);
                }
            });
        }
    },
    arrayDidChange: function(array, startIndex, rmCount, addCount) {
        // check if some elements have been added to array
        if (addCount !== 0 && !this.get('_isUpdateProperties')) {
            var elements = array.slice(startIndex, startIndex + addCount);
            this._addHistory({
                undoDescription: 'remove %@ elements [%@] at %@'.fmt(addCount, elements, startIndex),
                redoDescription: 'add %@ elements [%@] at %@'.fmt(addCount, elements, startIndex),
                undo: function() {
                    array.replace(startIndex, addCount);
                },
                redo: function() {
                    array.replace(startIndex, 0, elements);
                }
            });
        }
    }
});