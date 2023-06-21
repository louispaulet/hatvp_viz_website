$(document).ready(function() {
  Papa.parse('datasets/best_of_mandatElectifDto.csv', {
    download: true,
    header: true,
    complete: function(results) {
      let data = results.data;
      let years = [...new Set(data.map(item => item.annee_mandat))]; // Get unique years
      years.sort((a, b) => b - a); // Sort years in descending order

      years.forEach(year => {
        // Filter data for the current year
        let yearData = data.filter(item => item.annee_mandat == year);

        // Sort by remuneration descending
        let bestYearData = [...yearData];
        bestYearData.sort((a, b) => Number(b.remuneration) - Number(a.remuneration)); // Convert to numbers before sorting
        bestYearData = bestYearData.slice(0, 100);

        // Sort by remuneration ascending
        let worstYearData = [...yearData];
        worstYearData.sort((a, b) => Number(a.remuneration) - Number(b.remuneration));
        worstYearData = worstYearData.slice(0, 100);

        // Generate a new table for the current year
        let tableId = `table${year}`;
        let headingId = `heading${year}`;
        $('.container').append(`
          <h2 id="${headingId}" class="mt-5">Meilleurs salaires pour ${year}</h2>
          <button id="btn${year}" class="btn btn-primary mb-2">Voir les pires salaires</button>
          <table id="${tableId}" class="table table-striped table-bordered" style="width:100%">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type de Mandat</th>
                <th>Prénom</th>
                <th>Nom</th>
                <th>Date de Naissance</th>
                <th>Rémunération</th>
                <th>Année du Mandat</th>
                <th>Code Postal</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        `);

        // Function to populate the table
        let populateTable = (data) => {
          $(`#${tableId} tbody`).html(''); // Clear existing data
          data.forEach(row => {
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
        };

        // Populate the table with the best salaries initially
        populateTable(bestYearData);

        // Initialize DataTable with remuneration column descending order
        let table = $(`#${tableId}`).DataTable({
          "order": [[ 6, "desc" ]]
        });

        // Toggle between worst and best salaries on button click
        $(`#btn${year}`).on('click', function() {
          // Destroy the existing table
          table.destroy();
          if ($(this).text() === 'Voir les pires salaires') {
            // Populate with worst salaries and reinitialize DataTable
            populateTable(worstYearData);
            table = $(`#${tableId}`).DataTable({
              "order": [[ 6, "asc" ]]
            });
            $(this).text('Voir les meilleurs salaires');
            $(`#${headingId}`).text(`Pires salaires pour ${year}`);
          } else {
            // Populate with best salaries and reinitialize DataTable
            populateTable(bestYearData);
            table = $(`#${tableId}`).DataTable({
              "order": [[ 6, "desc" ]]
            });
            $(this).text('Voir les pires salaires');
            $(`#${headingId}`).text(`Meilleurs salaires pour ${year}`);
          }
        });
      });
    }
  });
});
