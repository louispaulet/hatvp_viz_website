$(document).ready(function () {
    Papa.parse('datasets/submissions_per_date.csv', {
        download: true,
        header: true,
        complete: function (results) {
            var data = results.data;
            data.forEach(function(d) {
                d.date = new Date(d.datedepot);
            });
            generateHistogram(data);
            generateCalendarPlot(data);

        }
    });
});

function generateCalendarPlot(data) {
    var dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var weeks = [];
    var dayCounts = [];

    data.sort((a, b) => a.date - b.date);  // sort data by date

    var currentWeek = [];
    var startDate = data[0].date;
    var endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // set end of week

    data.forEach(function(d) {
        if (d.date > endDate) {
            weeks.push(currentWeek);
            currentWeek = [];
            startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() + 1);
            endDate.setDate(startDate.getDate() + 6);
        }
        currentWeek[dayOfWeek[d.date.getDay()]] = +d.uuid_count;
    });
    if (currentWeek.length) weeks.push(currentWeek);

    var zData = [];
    var dayIndex = [];
    weeks.forEach(function(week) {
        var weekData = [];
        dayOfWeek.forEach(function(day) {
            weekData.push(week[day] || 0);
            if (!dayIndex.includes(day)) {
                dayIndex.push(day);
            }
        });
        zData.push(weekData);
    });

    var trace = {
        type: 'heatmap',
        x: [...Array(weeks.length).keys()],
        y: dayIndex,
        z: zData,
        colorscale: 'Greens',
        showscale: false,
        hoverinfo: 'z'
    };

    var layout = {
        title: 'Nombre de déclarations publiées par date depuis 2017',
        yaxis: {
            dtick: 1
        },
        xaxis: {
            tickvals: [0, weeks.length - 1],
            ticktext: [data[0].date.toDateString(), data[data.length - 1].date.toDateString()]
        },
        margin: {
            t: 50,
            b: 50,
            l: 50,
            r: 0
        }
    };

    var config = {
        responsive: true
    };

    Plotly.newPlot('calendar_graph', [trace], layout, config);
}

function generateHistogram(data) {
    // Create an array of dates and counts
    var dates = data.map(d => d.date);
    var counts = data.map(d => d.uuid_count);

    var trace = {
        x: dates,
        y: counts,
        type: 'histogram',
        name: 'Number of Submissions',
        xbins: {
            size: (dates[dates.length-1] - dates[0])/72  // calculate size for 72 bins 
        },
        marker: {
            color: 'blue',
        },
    };

    var layout = {
        title: 'Nombre de déclarations publiées par date depuis 2017',
        xaxis: {
            title: 'Date de publication'
        },
        yaxis: {
            title: 'Nombre de déclarations publiées'
        },
        autosize: true,
        
        bargap: 0.05,
        hovermode: 'closest',
        showlegend: false
    };

    var config = {
        responsive: true
    };

    var dataPlotly = [trace];

    Plotly.newPlot('bar_graphs', dataPlotly, layout, config);
}
