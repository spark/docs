
const path = require('path');
const fs = require('fs');

const topDir = path.normalize(path.join(__dirname, '..', '..'));

const topLevelInfo = [
    {
        "dir":"quickstart"
    },
    {
        "dir":"tutorials"
    },
    {
        "dir":"reference"
    },
    {
        "dir":"datasheets"
    },
    {
        "dir":"community"
    },
    {
        "dir":"workshops"
    }
];



const collections = {
    quickstart: {
        pattern: 'quickstart/*md',
        sortBy: 'order',
        orderDynamicCollections: [
        ]
    },
    reference: {
        pattern: 'reference/:section/*md',
        sortBy: 'order',
        orderDynamicCollections: [
            'device-os',
            'developer-tools',
            'device-cloud',
            'SDKs',
            'asset-tracking',
            'hardware',
            'discontinued'
        ]
    },
    tutorials: {
        pattern: 'tutorials/:section/*.md',
        sortBy: 'order',
        orderDynamicCollections: [
            'device-os',
            'developer-tools',
            'device-cloud',
            'cellular-connectivity',
            'asset-tracking',
            'diagnostics',
            'product-tools',
            'integrations',
            'hardware-projects',
            'learn-more'
        ]
    },
    datasheets: {
        pattern: 'datasheets/:section/*.md',
        sortBy: 'order',
        orderDynamicCollections: [
            'asset-tracking',
            'boron',
            'electron',
            'wi-fi',
            'certifications',
            'accessories',
            'app-notes',
            'discontinued'
        ]
    },
    community: {
        pattern: 'community/*md',
        sortBy: 'order',
        orderDynamicCollections: [
        ]
    },
    workshops: {
        pattern: 'workshops/:section/*md',
        sortBy: 'order',
        orderDynamicCollections: [
            'particle-workshops',
            'particle-101-workshop',
            'photon-maker-kit-workshop'
        ]
    },
    support: {
        pattern: 'support/:section/*.md',
        sortBy: 'order',
        orderDynamicCollections: [
            'general',
            'particle-devices-faq',
            'particle-tools-faq',
            'shipping-and-returns',
            'wholesale-store',
            'troubleshooting'
        ]
    },
    supportBase: {
        pattern: 'support/*.md',
        sortBy: 'order',
        orderDynamicCollections: [
        ]
    },
    quickstart: {
        pattern: 'quickstart/*md',
        sortBy: 'order',
        orderDynamicCollections: [
        ]
    },
    landing: {
        pattern: '*md',
        sortBy: 'order',
        orderDynamicCollections: [
        ]
    }
};


async function run() {
    for(const info of topLevelInfo) {
        console.log(info.dir);

        const srcDir = path.join(topDir, 'src', 'content', info.dir);
        const collectionOrder = collections[info.dir].orderDynamicCollections;

        // console.log('collectionOrder', collectionOrder);
        let menuJson = {};

        const processDir = function(dirToSearch, hrefPrefix) {
            console.log('processDir ' + dirToSearch);

            let ordering = [];

            for(const dirent of fs.readdirSync(dirToSearch, {withFileTypes:true})) {
                if (!dirent.name.endsWith('.md')) {
                    continue;
                }

                console.log(dirent.name);


                /*
                ---
                title: CAN Bus
                columns: two
                layout: tutorials.hbs
                order: 50
                description: Integrating CAN Bus data with your Tracker One
                ---
                */
                let obj = {
                    dir:dirent.name.substr(0, dirent.name.length - 3)
                };

                const content = fs.readFileSync(path.join(dirToSearch, dirent.name), 'utf8');

                let m = content.match(/\norder:[ \t]*([0-9]+)/);
                if (m) {
                    // console.log('match', m[1]);
                    obj.order = m[1];
                }
                m = content.match(/\ntitle:[ \t]*([^\n]+)/);
                if (m) {
                    obj.title = m[1];
                }
                obj.href = hrefPrefix + '/' + obj.dir + '/';

                ordering.push(obj);

            }
            ordering.sort(function(a, b) {
                return a.order - b.order;
            });
            // console.log('ordering', ordering);
            let dirInfo = [];

            for(let obj of ordering) {
                delete obj.order;
                dirInfo.push(obj);
            }

            return dirInfo;
        };


        if (collectionOrder && collectionOrder.length > 0) {
            // Two levels deep
            menuJson.items = [];

            for(let sectionName of collectionOrder) {
                menuJson.items.push({dir:sectionName,isSection:true});

                const dirInfo = processDir(path.join(srcDir, sectionName), '/' + info.dir + '/' + sectionName);

                menuJson.items.push(dirInfo);
            }
        }
        else {
            // Single level deep
            const dirInfo = processDir(srcDir, '/' + info.dir);

            menuJson.items = dirInfo;
        }

        fs.writeFileSync(path.join(srcDir, 'menu.json'), JSON.stringify(menuJson, null, 2));
    }   
}


run();
