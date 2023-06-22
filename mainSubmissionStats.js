$(document).ready(function () {
    Papa.parse('datasets/submissions_per_date.csv', {
        download: true,
        header: true,
        complete: function (results) {
            var data = results.data;
            generateBarGraph(data);
        }
    });
});

function generateBarGraph(data) {
    // Define the dimensions of the SVG container
    var margin = {top: 20, right: 20, bottom: 70, left: 60},
        width = 800 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // Create the SVG container
    var svg = d3.select("#bar_graphs").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Scale the range of the data
    var x = d3.scaleBand().range([0, width]).padding(0.1);
    var y = d3.scaleLinear().range([height, 0]);

    x.domain(data.map(function(d) { return d.datedepot; }));
    y.domain([0, d3.max(data, function(d) { return d.uuid_count; })]);

    // Add bar chart
    svg.selectAll("bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.datedepot); })
        .attr("width", x.bandwidth())
        .attr("y", function(d) { return y(d.uuid_count); })
        .attr("height", function(d) { return height - y(d.uuid_count); });

    // Add the x-axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

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
        .text("Number of Submissions");

    svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + 40) + ")")
        .style("text-anchor", "middle")
        .text("Date of Submission");
}
