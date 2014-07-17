Template.sprints.backlogItems = function () {
    return Stories.find({}, {
        sort: {
            position: 1
        }
    });
}

Template.sprints.rendered = function () {
    $( "#backlogItems, .sprint" ).sortable({ 
        stop: function (event, ui) {
            var parent = ui.item.parentElement.getAttribute("")
        },
        connectWith: "#backlogItems, .sprint"
    }).disableSelection();
    $( "#datepicker" ).datepicker();
}

Template.sprintsList.sprint = function () {
    return Sprints.find();
}

Template.sprintsInput.events = {
    'click input.insert': function () {
        var name = document.getElementById("name");
        var date = document.getElementById("datepicker");
        Sprints.insert({name: name.value, enddate: date.value, time: '0', status: 'ready'});
        name.value = '';
        date.value = '';
    }
}