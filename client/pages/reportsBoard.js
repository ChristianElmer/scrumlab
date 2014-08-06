Template.projectVelocity.rendered = function () {

    Meteor.setTimeout(function () {

        var sprints = Sprints.find().fetch();

        var data = {
            labels: [],
            datasets: [
                {
                    label: "Hours",
                    fillColor: "rgba(220,220,220,0.5)",
                    strokeColor: "rgba(220,220,220,0.8)",
                    highlightFill: "rgba(220,220,220,0.75)",
                    highlightStroke: "rgba(220,220,220,1)",
                    data: []
        },
                {
                    label: "Stories",
                    fillColor: "rgba(151,187,205,0.5)",
                    strokeColor: "rgba(151,187,205,0.8)",
                    highlightFill: "rgba(151,187,205,0.75)",
                    highlightStroke: "rgba(151,187,205,1)",
                    data: []
        }]
        }

        _.each(sprints, function (spr) {

            var issues = Issues.find({
                estimation: {
                    $exists: true
                },
                sprint: spr._id

            }).fetch();

            var totalTime = _.reduce(_.pluck(issues, 'estimation'), function (sum, val) {
                return sum + parseInt(val);
            }, 0);

            var totalStories = issues.length;

            var sprintName = spr.name;

            data.datasets[0].data.push(totalTime);

            if (!(_.contains(data.labels, sprintName))) {
                data.labels.push(sprintName);
            }

            data.datasets[1].data.push(totalStories);

        })

        var options = {
            //Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
            scaleBeginAtZero: true,

            //Boolean - Whether grid lines are shown across the chart
            scaleShowGridLines: true,

            //String - Colour of the grid lines
            scaleGridLineColor: "rgba(0,0,0,.05)",

            //Number - Width of the grid lines
            scaleGridLineWidth: 1,

            //Boolean - If there is a stroke on each bar
            barShowStroke: true,

            //Number - Pixel width of the bar stroke
            barStrokeWidth: 1,

            //Number - Spacing between each of the X value sets
            barValueSpacing: 5,

            //Number - Spacing between data sets within X values
            barDatasetSpacing: 0,

            //String - A legend template
            legendTemplate: "< ul class = \"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
        };

        var ctx = document.getElementById("myChart").getContext("2d");

        var barChart = new Chart(ctx).Bar(data, options);

    }, 500)

}