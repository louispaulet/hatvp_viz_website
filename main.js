$(document).ready(function() {
  Papa.parse('datasets/best_of_mandatElectifDto.csv', {
    download: true,
    header: true,
    complete: function(results) {
      let data = results.data;
      let years = [...new Set(data.map(item => item.annee_mandat))]; // Get unique years

      years.forEach(year => {
        // Filter data for the current year
        let yearData = data.filter(item => item.annee_mandat == year);
        // Sort by remuneration descending
        yearData.sort((a, b) => b.remuneration - a.remuneration);
        // Select top 10
        yearData = yearData.slice(0, 10);

        // Generate a new table for the current year
        let tableId = `table${year}`;
        $('.container').append(`
          <h2 class="mt-5">Best of Salaries for ${year}</h2>
          <table id="${tableId}" class="table table-striped table-bordered" style="width:100%">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type of Mandate</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Date of Birth</th>
                <th>Remuneration</th>
                <th>Mandate Year</th>
                <th>Postal Code</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        `);

        // Populate the table
        yearData.forEach(row => {
          $(`#${tableId} tbody`).append(
            `<tr>
              <td>${row['']}</td>
              <td>${row['date_depot']}</td>
              <td>${row['type_mandat']}</td>
              <td>${row['declarant_prenom']}</td>
              <td>${row['declarant_nom']}</td>
              <td>${row['declarant_date_naissance']}</td>
              <td>${row['remuneration']}</td>
              <td>${row['annee_mandat']}</td>
              <td>${row['code_postal']}</td>
            </tr>`
          );
        });

        $(`#${tableId}`).DataTable();
      });
    }
  });
});
