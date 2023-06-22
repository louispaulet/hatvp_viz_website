$(document).ready(function() {

  // Process data function
  const processData = (results) => {
    let data = results.data;

    // Compute best and worst 100 salaries overall
    let bestOverallData = getTopN(data, 'remuneration', 1);
    let worstOverallData = getTopN(data, 'remuneration', -1);

    // Generate overall table
    let {tableId, headingId} = generateTable('Toujours', '#table_section');
    populateTable(tableId, bestOverallData);
    let table = initDataTable(tableId, "desc");

    // Add overall toggle
    toggleData(table, tableId, `btnToujours`, headingId, bestOverallData, worstOverallData, 'Toujours');
  };

  // Parse CSV file
  parseCSV('datasets/best_of_mandatElectifDto.csv', processData);
});
