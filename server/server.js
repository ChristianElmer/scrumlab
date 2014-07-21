/*--- require sections --*/
var Fiber = Npm.require('fibers');
var Future = Npm.require('fibers/future');


/*--- publish section ---*/

//publish user data in order to have access to gitlab user data
Meteor.publish("userData", function () {
    if (this.userId) {
        return Meteor.users.find({
            _id: this.userId
        }, {
            fields: {
                'gitlab': 1
            }
        });
    } else {
        this.ready();
    }
});


//TODO: it should return only logged user projects
Meteor.publish('userProjects', function () {

    if (this.userId) {

        return Projects.find({
            member_ids: this.userId
        });
    } else
        return null;
});


Meteor.publish('issues', function (projectId) {
    return Issues.find();
});



// Serverside functions
Server = {

    getAdminApi: function () {
        Deprecated("getAdminApi", "getGitlabApi");
        var server = GitlabServers.findOne();
        return new GitLab({
            url: server.url,
            token: server.adminToken
        });
    },

    getGitlabApi: function (options) {
        return new GitLab(options);
    },

    getUserApi: function (privateToken) {
        Deprecated("getUserApi", "getGitlabApi");
        return new GitLab({
            url: Server.gitlabUrl,
            token: privateToken
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
                        'origin': api.options._id
                    });
                    if (existingUser !== undefined) {
                        Meteor.users.update(existingUser._id, {
                            $set: {
                                username: users[i].username,
                                gitlab: users[i],
                            }
                        });
                    } else {
                        Meteor.users.insert({
                            username: users[i].username,
                            gitlab: users[i],
                            origin: api.options._id
                        });
                    }
                }
            }).run();
        });
    },

    fetchProjects: function (api) {
        // Fetch all projects from Gitlab server
        api.projects.all(function (projects) {
            Fiber(function () {
                for (var i = 0; i < projects.length; i++) {
                    // Check if project already exists, then update or insert
                    var existingProject = Projects.findOne({
                        'gitlab.id': projects[i].id,
                        'origin': api.options._id
                    });

                    if (existingProject !== undefined) {
                        Projects.update(existingProject._id, {
                            $set: {
                                gitlab: projects[i]
                            }
                        });
                    } else {
                        Projects.insert({
                            gitlab: projects[i],
                            origin: api.options._id
                        });
                    }
                }
            }).run();
        });
    },

    fetchAllIssues: function (api) {
        // Fetch all issues from Gitlab server
        api.projects.all(function (projects) {
            Fiber(function () {
                for (var i = 0; i < projects.length; i++) {
                    api.projects.issues.list(projects[i].id, {}, function (issues) {
                        Fiber(function () {
                            for (var i = 0; i < issues.length; i++) {
                                // Check if issue already exists, then update or insert
                                var existingIssue = Issues.findOne({
                                    'gitlab.id': issues[i].id,
                                    'origin': api.options._id
                                });

                                if (existingIssue !== undefined) {
                                    Issues.update(existingIssue._id, {
                                        $set: {
                                            gitlab: issues[i]
                                        }
                                    });
                                } else {
                                    Issues.insert({
                                        gitlab: issues[i],
                                        origin: api.options._id
                                    });
                                }
                            }
                        }).run();
                    });
                }
            }).run();
        });
    },

    fetchUserIssues: function (api) {
        // Fetch all user issues from Gitlab server
        api.issues.all(function (issues) {
            Fiber(function () {
                for (var i = 0; i < issues.length; i++) {
                    // Check if issue already exists, then update or insert
                    var existingIssue = Issues.findOne({
                        'gitlab.id': issues[i].id,
                        'origin': api.options._id
                    });

                    if (existingIssue !== undefined) {
                        Issues.update(existingIssue._id, {
                            $set: {
                                gitlab: issues[i]
                            }
                        });
                    } else {
                        Issues.insert({
                            gitlab: issues[i],
                            origin: api.options._id
                        });
                    }
                }
            }).run();
        });
    },


    fetchProjectIssues: function (api, projectId) {
        // Fetch all project issues from Gitlab server
        api.projects.issues.list(projectId, {}, function (issues) {
            Fiber(function () {
                for (var i = 0; i < issues.length; i++) {
                    // Check if issue already exists, then update or insert
                    var existingIssue = Issues.findOne({
                        'gitlab.id': issues[i].id,
                        'origin': api.options._id
                    });

                    if (existingIssue !== undefined) {
                        Issues.update(existingIssue._id, {
                            $set: {
                                gitlab: issues[i]
                            }
                        });
                    } else {
                        Issues.insert({
                            gitlab: issues[i],
                            origin: api.options._id
                        });
                    }
                }
            }).run();
        });
    },
};

Meteor.startup(function () {
    // Fixtures 
    if (GitlabServers.find().count() == 0) {
        GitlabServers.insert({
            url: 'http://gitlab.ermlab.com/',
            token: 'zEysg8PhvSYh2QRkYGz3'
        });
    }

    // Fetch data from all servers
    _.each(GitlabServers.find().fetch(), function (server) {
        var api = new GitLab(server);
        Server.fetchUsers(api);
        Server.fetchProjects(api);
        Server.fetchAllIssues(api);
        //Server.fetchUserIssues(api);
        //Server.fetchProjectIssues(api);
    });
});

Accounts.registerLoginHandler(function (loginRequest) {
    // Use first available server if not specified in login request
    if (loginRequest.gitlabServerId == undefined) {
        loginRequest.gitlabServerId = GitlabServers.findOne()._id;
    }

    var server = GitlabServers.findOne(loginRequest.gitlabServerId);

    // Authorize user and update its profile
    var future = new Future();
    Server.getGitlabApi(server).users.session(loginRequest.email, loginRequest.password, function (data) {
        future.return(data);
    });
    var userData = future.wait();




    var existingUser = Meteor.users.findOne({
        'gitlab.username': userData.username,
        'origin': server._id
    });

    var userId = null;


    if (existingUser !== undefined) {


        userId = existingUser._id;
        Meteor.users.update({
            _id: userId
        }, {
            $set: {
                username: userData.username,
                gitlab: userData
            }
        });
    } else {
        userId = Meteor.users.insert({
            username: userData.username,
            gitlab: userData,
            origin: server._id
        });
    }

    if (userId !== null) {
        return {
            userId: userId,
        };

    }
});

Accounts.onLogin(function (data) {

    var user = data.user;

    // get all projects available for current user
    var projectsFuture = new Future();

    //majac usera, znajde jego origin, origin = id servera

    var server = GitlabServers.findOne(user.origin);
    Server.getGitlabApi({
        url: server.url,
        token: user.gitlab.private_token
    }).projects.all(function (projects) {
        projectsFuture.return(projects);
    });

    var projects = projectsFuture.wait();

    var in_projects = [];

    for (var i = 0; i < projects.length; i++) {
        in_projects.push(projects[i].id);


        //update projects members field
        //find project and update its members property

        var proj = Projects.findOne({
            'gitlab.id': projects[i].id,
            'origin': user.origin
        });

        Projects.update(proj._id, {
            $addToSet: {
                member_ids: user._id
            }
        });

        //update user in_projects field
        Meteor.users.update({
            _id: user._id
        }, {
            $addToSet: {
                project_ids: proj._id
            }
        });


    }


});