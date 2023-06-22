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
        }
    });
});

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
