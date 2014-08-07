Template.projectVelocity.rendered = function () {

    Meteor.setTimeout(function () {

        var sprints = Sprints.find().fetch();

        var data = {
            labels: [],
            datasets: [
                {
                    label: "Planned",
                    fillColor: "rgba(220,220,220,0.5)",
                    strokeColor: "rgba(220,220,220,0.8)",
                    highlightFill: "rgba(220,220,220,0.75)",
                    highlightStroke: "rgba(220,220,220,1)",
                    data: []
        },
                {
                    label: "Done",
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

            var closed = Issues.find({
                $and: [{
                    estimation: {
                        $exists: true
                    }
            }, {
                    estimation: {
                        $ne: ''
                    }
            }, {
                    sprint: spr._id
            }, {
                    'gitlab.state': 'closed'
            }]

            }).fetch();

            var totalTime = _.reduce(_.pluck(issues, 'estimation'), function (sum, val) {
                return sum + parseInt(val);
            }, 0);

            var doneTime = _.reduce(_.pluck(closed, 'estimation'), function (sum, val) {
                return sum + parseInt(val);
            }, 0);

            var sprintName = spr.name;

            data.datasets[0].data.push(totalTime);

            if (!(_.contains(data.labels, sprintName))) {
                data.labels.push(sprintName);
            }

            data.datasets[1].data.push(doneTime);

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

            responsive: true,

            //Number - Spacing between each of the X value sets
            barValueSpacing: 5,

            //Number - Spacing between data sets within X values
            barDatasetSpacing: 0,

            //String - A legend template
            legendTemplate: "<span style=\"background-color: rgba(220,220,220,0.5); width: 100px;height: 20px;display: block;font-family: &quot;Helvetica Neue&quot;;color: #666;text-align: center;\">Planned</span><span style=\"background-color:rgba(151,187,205,0.5); width: 100px;height: 20px;display: block;font-family: &quot;Helvetica Neue&quot;;color: #666;text-align: center;\">Done</span>"
        };

        var ctx = document.getElementById("myChart").getContext("2d");

        var barChart = new Chart(ctx).Bar(data, options);

        var legend = barChart.generateLegend()

        $("#legend").html(legend);

        var data = {
            labels: ["0", " 1", " 2", " 3", " 4", " 5", " 6", " 7", " 8", " 9", " 10", " 11", " 12", " 13", " 14", " 15", " 16", " 17", " 18", " 19", " 20", " 21", " 22", " 23", " 24", " 25", " 26", " 27", " 28", " 29", " 30", " 31", ],
            datasets: [
                {
                    label: "My First dataset",
                    fillColor: "rgba(220,220,220,0.2)",
                    strokeColor: "rgba(220,220,220,1)",
                    pointColor: "rgba(220,220,220,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(220,220,220,1)",
                    data: [80, 79, 75, 40, 45, 68, 68, 65, 62, 58, 54, 74, 60, 40, 34, 32, 22, 8, 6, 2, 0]
        },
                {
                    label: "My Second dataset",
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    pointHighlightFill: "#fff",
                    pointHighlightStroke: "rgba(151,187,205,1)",
                    data: [80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36, 32, 28, 24, 20, 16, 12, 8, 4, 0]
        }
    ]
        };

        var Tablica = ss.sum(data.datasets[0].data)

        console.log(Tablica)

        var options = {

            ///Boolean - Whether grid lines are shown across the chart
            scaleShowGridLines: true,

            //String - Colour of the grid lines
            scaleGridLineColor: "rgba(0,0,0,.05)",

            //Number - Width of the grid lines
            scaleGridLineWidth: 1,

            //Boolean - Whether the line is curved between points
            bezierCurve: true,

            responsive: true,

            //Number - Tension of the bezier curve between points
            bezierCurveTension: 0.4,

            //Boolean - Whether to show a dot for each point
            pointDot: true,

            //Number - Radius of each point dot in pixels
            pointDotRadius: 4,

            //Number - Pixel width of point dot stroke
            pointDotStrokeWidth: 1,

            //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
            pointHitDetectionRadius: 20,

            //Boolean - Whether to show a stroke for datasets
            datasetStroke: true,

            //Number - Pixel width of dataset stroke
            datasetStrokeWidth: 2,

            //Boolean - Whether to fill the dataset with a colour
            datasetFill: true,

            //String - A legend template
            legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].lineColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"

        };

        var ctx = document.getElementById("pBurndown").getContext("2d");

        var myLineChart = new Chart(ctx).Line(data, options);

    }, 500)

}