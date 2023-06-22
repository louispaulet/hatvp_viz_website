$(document).ready(function () {
    Papa.parse('datasets/submissions_per_date.csv', {
        download: true,
        header: true,
        complete: function (results) {
            var data = results.data;
            generateHistogram(data);
        }
    });
});

function generateHistogram(data) {
    // Define the dimensions of the SVG container
    var margin = {top: 20, right: 20, bottom: 70, left: 60},
        width = 1200 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // Create the SVG container
    var svg = d3.select("#bar_graphs").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Parse dates from the data
    var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
    data.forEach(function(d) {
        d.date = parseDate(d.datedepot);
    });

    // Scale the range of the data
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    x.domain(d3.extent(data, function(d) { return d.date; }));
    y.domain([0, d3.max(data, function(d) { return d.uuid_count; })]);

    // Create the histogram bins
    var bins = d3.histogram()
        .value(function(d) { return d.date; })
        .domain(x.domain())
        .thresholds(x.ticks(100))(data);

    // Adjust the y-axis scale to fit the bars within the graph
    y.domain([0, d3.max(bins, function(d) { return d.length; })]);

    // Add histogram bars
    svg.selectAll("bar")
        .data(bins)
        .enter().append("rect")
        .attr("class", "bar blue-bar")
        .attr("x", function(d) { return x(d.x0); })
        .attr("width", function(d) { return x(d.x1) - x(d.x0) - 1; })
        .attr("y", function(d) { return y(d.length); })
        .attr("height", function(d) { return height - y(d.length); });

    // Add the x-axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .text(function(d) { return d3.timeFormat("%Y-%m-%d")(d); });

    // Add the y-axis
    svg.append("g")
        .call(d3.axisLeft(y));

    // Add labels
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Nombre de déclarations publiées");

    svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + 40) + ")")
        .style("text-anchor", "middle")
        .text("Jour du publication");
}
