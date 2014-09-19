// Router must be defined in a file common to the client and server so both contexts can use them.


Router.configure({
    debug: true,
    before: function () {
        //console.log('before all');
    },
    layoutTemplate: 'masterLayout',

    //subscribtion of projects name
    waitOn: function () {
        return Meteor.subscribe('userProjects');
    },
});


Router.map(function () {
    this.route('test', {
        path: '/test',
        data: function () {
            var project = Projects.findOne(this.params.id);
            return {
                project: project,

            };
        },
    });

    this.route('pricing', {
        path: '/pricing',
        data: function () {},
    });

    this.route('support', {
        path: '/support',
        data: function () {},
    });

    this.route('about', {
        path: '/about',
        data: function () {},
    });

    this.route('home', {
        path: '/',
        layoutTemplate: 'staticPagesLayout',
        data: function () {
            return {};
        },
        onAfterAction: function () {
            document.title = 'Dashboard - Scrumlab';
        },
    });

    this.route('planBoard', {
        path: '/project/:id/plan',
        waitOn: function () {
            return [Meteor.subscribe('sprints', this.params.id), Meteor.subscribe('issues', this.params.id), Meteor.subscribe('tasks', this.params.id)];
        },
        data: function () {

            var project = Projects.findOne(this.params.id);
            if (!project) return;

            return {
                project: project,
                issues: Issues.find({
                    sprint: {
                        //"$exists": false
                    },
                    'project_id': project._id
                }, {
                    sort: {
                        position: 1,
                        created_at: -1 //descending timestamp
                    }
                }),
                projectId: project._id,
                sprints: Sprints.find({
                    'project_id': project._id
                }, {
                    sort: {
                        position: 1
                    }
                }),
                tasks: Tasks.find({
                    'project_id': project._id
                })
            };
        },
    });

    this.route('workBoard', {
        path: '/project/:id/work',
        waitOn: function () {
            return [Meteor.subscribe('sprints', this.params.id), Meteor.subscribe('issues', this.params.id), Meteor.subscribe('tasks', this.params.id)];
        },
        data: function () {
            var project = Projects.findOne(this.params.id);
            var sprint = Sprints.findOne({
                'project_id': this.params.id,
                'status': 'in progress'
            });
            var tasks = Tasks.find({
                'project_id': project._id
            });
            if (sprint == undefined) {
                return {
                    project: project
                };
            } else {
                var issues = Issues.find({
                    'sprint': sprint._id
                });
                return {
                    project: project,
                    sprint: sprint,
                    issues: issues,
                    tasks: tasks
                };
            }
        },
    });

    this.route('reportsBoard', {
        path: '/project/:id/reports',
        data: function () {
            var project = Projects.findOne(this.params.id);
            return {
                project: project,

            };
        },
    });

    this.route('serverLogin', {
        path: '/login',
        waitOn: function () {
            return [Meteor.subscribe('gitlabServers'), Meteor.subscribe('users')];
        }
    });

    this.route('settingsProjects', {
        path: '/projects-settings',
        onBeforeAction: function () {
            Session.set('fetching', true);
            Meteor.call('refreshUserProjects', function (err, data) {
                Session.set('fetching', false);
            });
        },
        data: function () {
            return {
                projects: Projects.find({
                    'member_ids.id': Meteor.userId()
                })
            };
        },
        onAfterAction: function () {
            document.title = 'Projects Settings - Scrumlab';
        },
    });

    this.route('about', {
        path: '/about',
        data: function () {
            return {};
        },
        onAfterAction: function () {
            document.title = 'About - Scrumlab';
        },
    });

    this.route('issuesHook', {
        path: '/issuesHook/',
        where: 'server',

        action: function () {
            var resp = {
                'body': this.request.body,
                'hostName': this.request.headers.host
            };

            var glUrl = resp.hostName;
            //todo: check if it is from http, https==

            //todo: only for tests
            if (resp.hostName.indexOf("ngrok.com") > -1) {
                glUrl = 'http://gitlab.ermlab.com/';
            }

            servInfo = GitlabServers.findOne({
                url: glUrl
            });

            //if servInfo undefinde then return http 404
            /*if(!servInfo)
             return Http.error(404);
             THIS FUNCTION WILL BE WRITTEN WHEN CENTRAL SERVER WILL BE ENABLED
             */
            Server.synchronizingIssues(resp, servInfo);
        }
    });

});