$(document).ready(function() {

  // Process data function
  const processData = (results) => {
    let data = results.data;

    // Compute best and worst 100 salaries overall
    let bestOverallData = getTopN(data, 'remuneration', 1);
    let worstOverallData = getTopN(data, 'remuneration', -1);

    // Generate overall table
    let {tableId, headingId} = generateTable('Toujours', '.container');
    populateTable(tableId, bestOverallData);
    let table = initDataTable(tableId, 6, "desc");

    // Add overall toggle
    toggleData(table, tableId, `btnToujours`, headingId, bestOverallData, worstOverallData, 'Toujours');

    let years = [...new Set(data.map(item => item.annee_mandat))]; // Get unique years
    years.sort((a, b) => b - a); // Sort years in descending order

    years.forEach(year => {
      // Filter data for the current year
      let yearData = data.filter(item => item.annee_mandat == year);

      // Compute best and worst 100 salaries for the year
      let bestYearData = getTopN(yearData, 'remuneration', 1);
      let worstYearData = getTopN(yearData, 'remuneration', -1);

      // Generate year table
      let {tableId, headingId} = generateTable(year, '.container');
      populateTable(tableId, bestYearData);
      let table = initDataTable(tableId, 6, "desc");

      // Add year toggle
      toggleData(table, tableId, `btn${year}`, headingId, bestYearData, worstYearData, year);
    });
  };

  // Parse CSV file
  parseCSV('datasets/best_of_mandatElectifDto.csv', processData);
});
