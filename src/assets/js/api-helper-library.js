$(document).ready(function() {
    if ($('.apiHelper').length == 0) {
        return;
    }

    $('.apiHelperLibraryBuilds').each(function() {
        const thisPartial = $(this);

        let libInfo;
        
        const updateTable = function() {
            const deviceOs = $(thisPartial).find('.apiHelperLibraryBuildsVersion').val();

            const buildResults = libInfo.versions[libInfo.attributes.version].builds[deviceOs];
            console.log('update table', buildResults);

            let examples = [];

            let html = '';
            html += '<tr><th>Example</th>';
            for(const platform in buildResults) {
                html += '<th>' + platform + '</th>';          

                for(const example in buildResults[platform]) {
                    if (!examples.includes(example)) {
                        examples.push(example);
                    }
                }
            }
            html += '</tr>';
            $(thisPartial).find('.apiHelperLibraryBuildsOutput > thead').html(html);


            html = '';
            for(const example of examples) {
                html += '<tr>';

                html += '<td>' + example + '</td>';

                for(const platform in buildResults) {
                    let cellContents;

                    if (buildResults[platform][example] === true) {
                        cellContents = '\u2705'; // Green Check
                    }
                    else if (buildResults[platform][example] === false) {
                        cellContents = '\u274C'; // Red X
                    }    
                    else {
                        cellContents = 'nbsp;';
                    }

                    html += '<td>' + cellContents + '</td>';
                }
                html += '</tr>';
            }

            $(thisPartial).find('.apiHelperLibraryBuildsOutput > tbody').html(html);

        };

        fetch($(thisPartial).attr('data-info'))
            .then(response => response.json())
            .then(function(data) {
            // 
            libInfo = data;
            $(thisPartial).find('.apiHelperLibraryBuildsVersion').html('');

            const builds = libInfo.versions[libInfo.attributes.version].builds;
            for(const deviceOs in builds) {
                let html = '';
                html += '<option value="' + deviceOs + '">' + deviceOs + '</option>\n';
                $(thisPartial).find('.apiHelperLibraryBuildsVersion').append(html);
            }
            updateTable();
        });        

        $(thisPartial).find('.apiHelperLibraryBuildsVersion').on('change', updateTable);
    });

    $('.apiHelperLibraryBrowser').each(function() {
        const thisPartial = $(this);

        let extractedFiles;
        let libInfo;

        const updateFileSelector = function() {            
            $(thisPartial).find('.apiHelperLibrarySelect').show();
            $(thisPartial).find('.apiHelperLibraryBrowserOutput').show();

            const sel = $(thisPartial).find('.apiHelperLibrarySelect');
            $(sel).html('<option value="-1" selected>Select file to view</option>');

            console.log('extractedFiles', extractedFiles);

            for(let ii = 0; ii < extractedFiles.length; ii++) {
                const f = extractedFiles[ii];

                if (f.size == 0) { // f.name == '.' || f.name == '.git'
                    continue;
                }
                $(sel).append('<option value="' + ii + '">' + f.name + '</option>');
            }
        };

        const updateFile = function() {
            const sel = $(thisPartial).find('.apiHelperLibrarySelect');
            const index = parseInt($(sel).val());

            const outputDivElem = $(thisPartial).find('.apiHelperLibraryBrowserOutputDiv');
            $(outputDivElem).hide();

            const outputPreElem = $(thisPartial).find('.apiHelperLibraryBrowserOutputPre');
            $(outputPreElem).hide();

            const outputCodeElem = $(thisPartial).find('.apiHelperLibraryBrowserOutputCode');
            $(outputCodeElem).hide();

            if (index < 0) {
                return;
            }

            const name = extractedFiles[index].name;
            if (name.endsWith('.txt') || name.endsWith('.properties') || name.toUpperCase().startsWith('LICENSE')) {
                $(outputPreElem).find('pre').text(extractedFiles[index].readAsString());
                $(outputPreElem).show();
            }
            else if (name.endsWith('.md')) {
                var converter = new showdown.Converter();
                
                converter.setFlavor('github');

                $(outputDivElem).html(converter.makeHtml(extractedFiles[index].readAsString()));

                // 
                $(outputDivElem).find('img').each(function() {
                    const src = $(this).attr('src');
                    const lowerSrc = src.toLowerCase();
                    if (!lowerSrc.startsWith('http') && !lowerSrc.startsWith('/')) {
                        $(this).after('<span>[image unavailable]</span>');
                        $(this).hide();
                    }
                });

                $(outputDivElem).show();
            }
            else {
                $(outputCodeElem).show();

                const thisCodeElem = $(outputCodeElem).find('code');
                $(thisCodeElem).text(extractedFiles[index].readAsString());
                $(thisCodeElem).removeClass('prettyprinted');
                if (prettyPrint) {
                    prettyPrint();
                }    
            }
        };

        $(thisPartial).find('.apiHelperLibrarySelect').on('change', function() {
            if (extractedFiles) {
                updateFile();
            }
            else {
            }
        });

        $(thisPartial).find('.apiHelperLibraryStart').on('click', function() {
            $(thisPartial).find('.apiHelperLibraryStart').hide();
            $(thisPartial).find('.apiHelperLibrarySelect').show();
            
            fetch($(thisPartial).attr('data-info'))
                .then(response => response.json())
                .then(function(data) {
                // 
                libInfo = data;

                fetch(libInfo.links.download)
                    .then(response => response.arrayBuffer())
                    .then(function(gzipData) {
                    const tarData = window.pako.inflate(gzipData);

                    untar(tarData.buffer)
                        .progress(function(data) {
                        })
                        .then(function(data) {
                            extractedFiles = data;
                            updateFileSelector();
                        }); 
                });
            });            
                
        });



    });
});

