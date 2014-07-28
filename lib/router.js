// Router must be defined in a file common to the client and server so both contexts can use them.

Router.configure({
    debug: true,
    before: function () {
        //console.log('before all');
    },
    loadingTemplate: 'loading',
    layoutTemplate: 'masterLayout',

    //subscribtion of projects name
    waitOn: function () {
        return Meteor.subscribe('userProjects');
    },

});


Router.map(function () {
    this.route('home', {
        path: '/',
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
            return [Meteor.subscribe('sprints', this.params.id), Meteor.subscribe('issues', this.params.id)];
        },
        data: function () {
            var project = Projects.findOne(this.params.id);
            return {
                project: project,
                issues: Issues.find({
                    sprint: {
                        "$exists": false
                    },
                    'project_id': project._id
                }, {
                    sort: {
                        //position: -1
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
                })
            };
        },
    });

    this.route('workBoard', {
        path: '/project/:id/work',
        waitOn: function () {
            return [Meteor.subscribe('sprints', this.params.id), Meteor.subscribe('issues', this.params.id)];
        },
        data: function () {
            var project = Projects.findOne(this.params.id);
            var sprint = Sprints.findOne({
                'project_id': this.params.id,
                'status': 'in progress'
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
                    issues: issues
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

    this.route('settingsProjects', {
        path: '/projects-settings',
        onBeforeAction: function () {
            Meteor.call('refreshUserProjects');
        },
        data: function () {
            return {
                projects: Projects.find({
                    member_ids: Meteor.userId()
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



});