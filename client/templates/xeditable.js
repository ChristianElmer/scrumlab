// Based on
// http://stackoverflow.com/questions/22867690/how-do-i-use-x-editable-on-dynamic-fields-in-a-meteor-template-now-with-blaze
var rendered = function (self) {
    var container = self.$('*').eq(0);
    if (!container.hasClass('processed')) {
        container.addClass('processed');
        var options = _.extend(self.data, {
            // Default success function, saves document do database
            unsavedclass: null,
            success: function (response, value) {
                var options = $(this).data().editable.options;
                if (options.collection && options.id && options.field) {
                    var update = {};
                    update[options.field] = value;
                    options.collection.update(options.id, {
                        $set: update
                    });
                }
                
                if (typeof options.updated == 'function') {
                    options.updated(options.id);
                }
            }
        });
        container.editable(options);
    }

    self.autorun(function () {
        var value = Blaze.getData().value;
        var elData = container.data();
        if (elData && elData.editable) {
            elData.editable.setValue(value, true);
            // no idea why this is necessary; xeditable bug?
            if (elData.editableContainer)
                elData.editableContainer.formOptions.value = elData.editable.value;
        }
    });    
}


Template.xeditable.rendered = function () {
    rendered(this);
}
    

Template.xeditableImg.rendered = function () {
    rendered(this);
}