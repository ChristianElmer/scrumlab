/*--- require sections --*/
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');






// Serverside functions
Server = {
    getGitlabApi: function (options) {
        if (options.origin === undefined) {
            throw new Error("Origin is not defined");
        }

        return new GitLab(options);
    },

    createIssue: function (issue) {
        // Create issue at GitLab server
        /*
        id (required) - The ID of a project
        title (required) - The title of an issue
        description (optional) - The description of an issue
        assignee_id (optional) - The ID of a user to assign issue
        milestone_id (optional) - The ID of a milestone to assign issue
        labels (optional) - Comma-separated label names for an issue
        */

        //TODO:permissions, who can create new stories?
        var user = Meteor.user();
        if (!user) {
            return;
        }

        var server = GitlabServers.findOne(user.origin);
        var api = Server.getGitlabApi({
            url: server.url,
            token: user.token,
            origin: server._id
        });


        var projectId = issue.project_id;
        gitlabIssue = {
            'id': issue.gitlabProjectId, //id of a gitlab project!
            'title': issue.title,
            'description': issue.description,
            'assignee_id': issue.assignee_id,
            'labels': 'story'
        };


        api.issues.create(issue.gitlabProjectId, gitlabIssue, function (glIssue) {
            Fiber(function () {
                console.log("After creation of issue", glIssue);


                /* var new_issue = {
                    'project_id': projectId, //mongo project_id
                    'gitlab': glIssue,
                    'origin': api.options.origin,
                    'estimation': issue.
                    'created_at': issue.created_at
                };*/


                var new_issue = BuildAnIssue(issue, glIssue);

                console.log('issue on server \n', new_issue);

                var output = Issues.insert(new_issue);
                // Add placeholder task
                Tasks.insert({
                    'project_id': new_issue.project_id,
                    'issue_id': output,
                    'name': new_issue.gitlab.title,
                    'status': 'toDo',
                    'placeholder': true
                });
                return output;

            }).run(); //end fiber

        }); //end api.issue.create

    }, //end issue create

    editIssue: function (updateObject) {
        // Edit issue at GitLab server
        /*
        id (required) - The ID of a project
        issue_id (required) - The ID of a project's issue
        title (optional) - The title of an issue
        description (optional) - The description of an issue
        assignee_id (optional) - The ID of a user to assign issue
        milestone_id (optional) - The ID of a milestone to assign issue
        labels (optional) - Comma-separated label names for an issue
        state_event (optional) - The state event of an issue ('close' to close issue and 'reopen' to reopen it)
        */
        var user = Meteor.user();
        if (!user) {
            return;
        }
        console.dir(updateObject);
        var server = GitlabServers.findOne(user.origin);
        var api = Server.getGitlabApi({
            url: server.url,
            token: user.token,
            origin: server._id
        });
        api.issues.edit(updateObject.id, updateObject.issue_id, updateObject, function (data) {

            console.log("After editing issue", data);



        });
    },

    refreshUserProjects: function () {
        var user = Meteor.user();

        if (!user) {
            return;
        }

        var server = GitlabServers.findOne(user.origin);
        var api = Server.getGitlabApi({
            url: server.url,
            token: user.token,
            origin: server._id
        });

        //we fetch user projects, and execute callback
        Server.fetchProjects(api, function (ids) {

            console.log('ref proj:', ids);

            Meteor.users.update(user._id, {
                $set: {
                    project_ids: ids
                }
            });


            _.each(ids, function (id) {
                // TODO: refactor, issues should be fetched when project is activated
                Server.fetchProjectIssues(api, id);
                Server.fetchProjectMembers(api, id);
                Server.fetchProjectMilestones(api, id);
            });
        });
    },

    fetchUsers: function (api) {
        // Fetch all users from Gitlab server
        api.users.all(function (users) {
            Fiber(function () {

                for (var i = 0; i < users.length; i++) {
                    // Check if user already exists, then update or insert
                    var existingUser = Meteor.users.findOne({
                        'gitlab.id': users[i].id,
                        'origin': api.options.origin
                    });

                    if (existingUser !== undefined) {

                        /* console.log("!!! Existing\n",existingUser.gitlab);                    
                        console.log("from gitlab \n",users[i]);*/


                        //we extend existed user by the new information which comes from gitlab
                        //the fields in existing user are overwritten by the gitlab users[i], fields
                        //that didn't appear in gitlab user object stay untouched
                        var usrUpdated = _.extend(existingUser.gitlab, users[i]);

                        //console.log("merged \n",usrUpdated);

                        Meteor.users.update(existingUser._id, {
                            $set: {
                                'username': users[i].username,
                                'gitlab': usrUpdated,
                            }
                        });

                        //todo: gitlab object is overwritten, possible data loss!
                        //use _.extend method form underscore.js
                        /*Meteor.users.update(existingUser._id, {
                            $set: {
                                'username': users[i].username,
                                'gitlab': users[i],
                            }
                        });*/

                    } else {
                        Meteor.users.insert({
                            'username': users[i].username,
                            'gitlab': users[i],
                            'origin': api.options.origin
                        });
                    }
                }
            }).run();
        });
    },

    // Fetch all projects for authenticated (by private_token) api user from Gitlab server
    fetchProjects: function (api, callback) {

        api.projects.all(function (projects) {
            var allProjectIds = [];
            Fiber(function () {
                console.log('Projects: ' + projects.length);
                for (var i = 0; i < projects.length; i++) {
                    // Check if project already exists, then update or insert
                    var existingProject = Projects.findOne({
                        'gitlab.id': projects[i].id,
                        'origin': api.options.origin
                    });

                    var projectId = null;

                    //todo: refactor to update with upsert parameter
                    if (existingProject !== undefined) {

                        //todo: better way for dealing with updates
                        var projUpdated = _.extend(existingProject.gitlab, projects[i]);
                        Projects.update(existingProject._id, {
                            $set: {
                                'gitlab': projUpdated,
                            }
                        });
                        projectId = existingProject._id;
                    } else {
                        projectId = Projects.insert({
                            'gitlab': projects[i],
                            'origin': api.options.origin
                        });
                    }

                    allProjectIds.push(projectId);
                }
                if (callback) {
                    callback(allProjectIds);
                }
            }).run();

        });
    },

    fetchUserIssues: function (api) {
        // Fetch all user issues from Gitlab server
        api.issues.all(function (issues) {
            Fiber(function () {

                //todo: the same logic as in fetchProjectIssues
                for (var i = 0; i < issues.length; i++) {
                    // Check if issue already exists, then update or insert
                    var existingIssue = Issues.findOne({
                        'gitlab.id': issues[i].id,
                        'origin': api.options.origin
                    });

                    if (existingIssue !== undefined) {


                        var issueUpdated = _.extend(existingIssue.gitlab, issues[i]);

                        Issues.update(existingIssue._id, {
                            $set: {
                                'gitlab': issueUpdated
                            }
                        });
                    } else {
                        Issues.insert({
                            // TODO: nie wiemy z jakiego projektu jest to issue
                            // 'project_id': ??????
                            // Trzeba pobrac projekt na podstawie id i origin, a potem jego id
                            'gitlab': issues[i],
                            'origin': api.options.origin
                        });
                    }
                }
            }).run();
        });
    },

    fetchProjectIssues: function (api, projectId) {
        var project = Projects.findOne(projectId);

        // Fetch all project issues from Gitlab server
        api.projects.issues.list(project.gitlab.id, {}, function (issues) {
            Fiber(function () {

                //todo: the same logic as in fetchUserIssues

                for (var i = 0; i < issues.length; i++) {
                    // Check if issue already exists, then update or insert
                    var existingIssue = Issues.findOne({
                        'gitlab.id': issues[i].id,
                        'origin': api.options.origin
                    });

                    if (existingIssue !== undefined) {

                        var issueUpdated = _.extend(existingIssue.gitlab, issues[i]);

                        Issues.update(existingIssue._id, {
                            $set: {
                                'gitlab': issueUpdated
                            }
                        });

                    } else {
                        var output = Issues.insert({
                            'project_id': projectId,
                            'gitlab': issues[i],
                            'origin': api.options.origin
                        });
                        Tasks.insert({
                            'project_id': projectId,
                            'issue_id': output,
                            'name': issues[i].title,
                            'status': 'toDo',
                            'placeholder': true
                        });
                    }
                }
            }).run();
        });
    },

    synchronizingIssues: function (respIncome, servInfo) {
        var hookIssue = respIncome.body.object_attributes;

        var finder = Issues.findOne({
            "gitlab.id": hookIssue.id,
            "origin": servInfo._id,
        });

        if (finder == undefined) {
            var proj = Projects.findOne({
                "gitlab.id": hookIssue.project_id,
                "origin": servInfo._id,
            });
            var new_issue = {
                'project_id': proj._id, //mongo project_id
                'origin': servInfo._id,
                'created_at': hookIssue.created_at,
                'gitlab': hookIssue //client and server should update this field
            };

            //mongo issue id
            var issueId = Issues.insert(new_issue);

            // Fetching new issue from GitLab server
            api.issues.show(proj.gitlab.id, new_issue.gitlab.id, function (glIssue) {
                Fiber(function () {
                    var output = Issues.insert({
                        'project_id': proj.gitlab.id,
                        'gitlab': glIssue,
                        'origin': api.options.origin
                    });
                    Tasks.insert({
                        'project_id': proj.gitlab.id,
                        'issue_id': output,
                        'name': glIssue.title,
                        'status': 'toDo',
                        'placeholder': true
                    });
                }).run();
            });

        } else {
            // Updating existing issue
            gitlabObject = finder.gitlab;
            gitlabObject = _.extend(gitlabObject, hookIssue);
            gitlabObject = _.omit(gitlabObject, 'assignee_id', 'author_id', 'branch_name', 'milestone_id');

            Issues.update(
                finder._id, {
                    $set: {
                        'gitlab': gitlabObject,
                    }
                });

            Issues.update({
                _id: finder._id
            }, {
                $addToSet: {
                    'gitlab.labels': {
                        $each: [hookIssue.labels]
                    }
                }
            })
        }
    },

    fetchProjectMilestones: function (api, projectId) {
        var project = Projects.findOne(projectId);

        // Fetch all project issues from Gitlab server
        api.projects.milestones.list(project.gitlab.id, function (milestones) {
            Fiber(function () {
                for (var i = 0; i < milestones.length; i++) {
                    // Check if issue already exists, then update or insert
                    var existingSprint = Sprints.findOne({
                        'gitlab.id': milestones[i].id,
                        'origin': api.options.origin
                    });

                    if (existingSprint !== undefined) {
                        Sprints.update(existingSprint._id, {
                            $set: {
                                'gitlab': milestones[i]
                            }
                        });
                    } else {
                        Sprints.insert({
                            'project_id': projectId,
                            'gitlab': milestones[i],
                            'origin': api.options.origin
                        });
                    }
                }
            }).run();
        });
    },

    fetchProjectMembers: function (api, projectId) {
        var project = Projects.findOne(projectId);

        if (!project)
            throw new Error("Project with id=" + projectId + " does not exist, so I cant find its members");
        if (project.gitlab.owner != undefined) {
            // If project has an owner list of members is taken from project members
            api.projects.members.list(project.gitlab.id, function (members) {

                //async code which updates collections have to run in Fiber
                Fiber(function () {

                    //choose from the array of objects (members) only member id (gitlab id)
                    var usersGlIds = _.pluck(members, 'id');
                    // get members' access levels
                    var userAccessLevels = _.pluck(members, 'access_level');


                    //update project collection, add members id to member_ids array
                    var usersMongoIds = Meteor.users.find({
                        'gitlab.id': {
                            $in: usersGlIds
                        },
                        'origin': project.origin
                    }, {
                        fields: {
                            'origin': 1
                        }
                    }).fetch();

                    //choose from the array of objects (users) only mongo user id
                    usersMongoIds = _.pluck(usersMongoIds, '_id');
                    // Merge into a table of {id, access_level}
                    var membersIdAccess = [];
                    for (var i = 0; i < usersMongoIds.length; i++) {
                        var obj = {};
                        obj['id'] = usersMongoIds[i];
                        obj['access_level'] = userAccessLevels[i];
                        membersIdAccess.push(obj);
                    }

                    Projects.update(project._id, {
                        $set: {
                            'member_ids': membersIdAccess
                        }
                    });

                    console.log('mongo---', membersIdAccess);
                }).run();

            }); //end api

        } else {
            // If project has no owner list of members is taken only from the group
            api.groups.listMembers(project.gitlab.namespace.id, function (members) {

                //async code which updates collections have to run in Fiber
                Fiber(function () {
                    //choose from the array of objects (members) only member id (gitlab id)
                    var usersGlIds = _.pluck(members, 'id');
                    // get members' access levels
                    var userAccessLevels = _.pluck(members, 'access_level');

                    //update project collection, add members id to member_ids array
                    var usersMongoIds = Meteor.users.find({
                        'gitlab.id': {
                            $in: usersGlIds
                        },
                        'origin': project.origin
                    }, {
                        fields: {
                            'origin': 1
                        }
                    }).fetch();

                    //choose from the array of objects (users) only mongo user id
                    usersMongoIds = _.pluck(usersMongoIds, '_id');
                    // Merge into a table of {id, access_level}
                    var membersIdAccess = [];
                    for (var i = 0; i < usersMongoIds.length; i++) {
                        var obj = {};
                        obj['id'] = usersMongoIds[i];
                        obj['access_level'] = userAccessLevels[i];
                        membersIdAccess.push(obj);
                    }

                    Projects.update(project._id, {
                        $set: {
                            'member_ids': membersIdAccess
                        }
                    });

                    console.log('mongo---', membersIdAccess);
                }).run();

            }); //end api
        }
    }, //end func

    sprintFinisher: function () {
        var sprints = Sprints.find({
            status: 'in progress'
        }).fetch();
        _.each(sprints, function (spr) {
            if (CheckDate(spr.endDate) == false) {
                Sprints.update(spr._id, {
                    $set: {
                        'status': 'finished',
                        'closedAt': CurrDate
                    }
                });
            }
        });
    }
};

Meteor.startup(function () {


    // Fixtures 
    if (GitlabServers.find().count() === 0) {
        GitlabServers.insert({
            url: 'http://gitlab.ermlab.com/',
            token: '7d1dByE7ecRyBHKhieWR'
        });
    }


    // Fetch data from all servers
    _.each(GitlabServers.find().fetch(), function (server) {
        server.origin = server._id;
        var api = Server.getGitlabApi(server);
        Server.fetchUsers(api);
        Server.fetchProjects(api);
    });


    // Set schedule to check if sprint has ended
    // Schedule to fire every day at 1:00 am
    // parser.text('at 1:00 am');
    // Schedule to fire every 10 seconds
    // parser.recur().every(10).second();
    SyncedCron.add({
        name: 'Sprint ending schedule',
        schedule: function (parser) {
            // parser is a later.parse object
            return parser.text('at 1:00 am');
        },
        job: Server.sprintFinisher
    });
    SyncedCron.start();

    // Run sprint finishing 
    Server.sprintFinisher();
});

Accounts.registerLoginHandler(function (loginRequest) {
    // Use first available server if not specified in login request
    if (loginRequest.gitlabServerId === undefined) {
        loginRequest.gitlabServerId = GitlabServers.findOne()._id;
    }

    var server = GitlabServers.findOne(loginRequest.gitlabServerId);

    // Authorize user and update its profile
    var future = new Future();

    server.origin = server._id;
    var api = Server.getGitlabApi(server);
    api.users.session(loginRequest.email, loginRequest.password, function (data) {
        future.return(data);
    });
    var userData = future.wait();


    if (userData === true) {
        // TODO: Gitlab auth failes
    } else {
        // Gitlab auth successful
        var existingUser = Meteor.users.findOne({
            'gitlab.username': userData.username,
            'origin': server._id
        });

        var userId = null;

        if (existingUser) {
            userId = existingUser._id;

            //we merged the gitlab fields with those in existing user
            var usrUpdated = _.extend(existingUser.gitlab, userData);
            Meteor.users.update(existingUser._id, {
                $set: {
                    username: userData.username,
                    token: userData.private_token,
                    gitlab: usrUpdated,
                }
            });

        } else {
            userId = Meteor.users.insert({
                username: userData.username,
                gitlab: userData,
                origin: server._id,
                token: userData.private_token
            });
        }

        // return id user to log in
        if (userId !== null) {
            return {
                userId: userId,
            };
        }
    }
});

Accounts.onLogin(function (data) {

});