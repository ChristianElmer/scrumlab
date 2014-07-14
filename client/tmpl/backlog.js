if (Meteor.isClient) {
    
    Template.input.events = {
        'click input.insert': function() {
            var name = document.getElementById("name");
            var desc = document.getElementById("description");
            var hours = document.getElementById("time").value;
            var assignee = document.getElementById("assignee_selector");
            var assignee_name = assignee.options[assignee.selectedIndex].text;
            Stories.insert({name: name.value, description: desc.value, time: hours, assignee: assignee_name});
            name.value = '';
            desc.value = '';
        }
    }
    
    Template.user_stories.events = {
        'click .insert_task': function(event) {
            var task = event.currentTarget.parentElement;
            var story = task.parentElement.parentElement.parentElement;
            var story_id = story.getAttribute("id")
            var name = task.getElementsByClassName("t_name")[0].value;
            var desc = task.getElementsByClassName("t_description")[0].value;
            var hours = task.getElementsByClassName("t_time")[0].value;
            var assignee = task.getElementsByClassName("t_assignee_selector")[0];
            var assignee_name = assignee.options[assignee.selectedIndex].text;
            Tasks.insert({story_id: story_id, name: name, description: desc, time: hours, assignee: assignee_name});
            name.value = '';
            desc.value = '';
        }
    }
    
    Template.assignees.assignees = function(){
        return Assignees.find();
    }
    
    Template.user_stories.backlog_items = function(){
        return Stories.find();
    }
    
    Template.user_stories.tasks = function(id){
        return Tasks.find({story_id: id});
    } 
    
}