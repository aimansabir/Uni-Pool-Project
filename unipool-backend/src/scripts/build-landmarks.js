const fs = require('fs/promises');

const GEOCODER_BASE_URL =
    process.env.ROUTE_GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org';

const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL || '';
const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT || `uni-pool-backend/1.0 (${NOMINATIM_EMAIL || 'dev'})`;

const PLACES = [
    { name: 'Maskan Gate - Gulshan-e-Iqbal / Rashid Minhas side', searchText: 'Maskan Gate, Karachi, Pakistan' },
    { name: 'Patel Hospital - Gulshan-e-Iqbal, University Road', searchText: 'Patel Hospital, University Road, Karachi, Pakistan' },
    { name: 'Nipa Chowrangi - Gulshan-e-Iqbal, University Road', searchText: 'Nipa Chowrangi, Karachi, Pakistan' },
    { name: 'Aladin Park - Gulshan-e-Iqbal Block 10A', searchText: 'Aladin Park, Karachi, Pakistan' },
    { name: 'Millennium Mall - Gulshan-e-Iqbal, Rashid Minhas Road', searchText: 'Millennium Mall, Karachi, Pakistan' },
    { name: 'University Road - Gulshan-e-Iqbal corridor', searchText: 'University Road, Karachi, Pakistan' },
    { name: 'Teen Talwar - Clifton Block 8', searchText: 'Teen Talwar, Clifton, Karachi, Pakistan' },
    { name: 'Boat Basin - Clifton Block 5', searchText: 'Boat Basin, Clifton, Karachi, Pakistan' },
    { name: 'Clifton Block 2 - Clifton', searchText: 'Clifton Block 2, Karachi, Pakistan' },
    { name: 'IBA Main Campus - University Road, Gulshan-e-Iqbal', searchText: 'Institute of Business Administration Main Campus, Karachi, Pakistan' },
    { name: 'IBA City Campus - Saddar, Dr. Daud Pota Road', searchText: 'Institute of Business Administration City Campus, Karachi, Pakistan' },

    { name: 'LuckyOne Mall - Rashid Minhas Road / F.B. Area side', searchText: 'LuckyOne Mall, Karachi, Pakistan' },
    { name: 'Dolmen Mall Clifton - Marine Promenade / Clifton waterfront', searchText: 'Dolmen Mall Clifton, Karachi, Pakistan' },
    { name: 'Ocean Mall - Clifton Block 9', searchText: 'Ocean Mall, Karachi, Pakistan' },
    { name: 'Atrium Mall - Saddar / Zaib-un-Nissa Street', searchText: 'Atrium Mall, Saddar, Karachi, Pakistan' },
    { name: 'The Forum - Khayaban-e-Roomi / Clifton', searchText: 'The Forum, Clifton, Karachi, Pakistan' },

    { name: 'Aga Khan University Hospital - Stadium Road / Gulshan-e-Iqbal', searchText: 'Aga Khan University Hospital, Karachi, Pakistan' },
    { name: 'Liaquat National Hospital - Stadium Road', searchText: 'Liaquat National Hospital, Karachi, Pakistan' },
    { name: 'NICVD - Saddar / Rafiqui Shaheed Road', searchText: 'National Institute of Cardiovascular Diseases, Karachi, Pakistan' },
    { name: 'JPMC - Saddar / Rafiqui Shaheed Road', searchText: 'Jinnah Postgraduate Medical Centre, Karachi, Pakistan' },
    { name: 'Dow University Hospital Ojha - Gulzar-e-Hijri / Ojha side', searchText: 'Dow University Hospital Ojha Campus, Karachi, Pakistan' },
    { name: 'South City Hospital - Shahrah-e-Firdousi / Clifton Block 9', searchText: 'South City Hospital, Karachi, Pakistan' },
    { name: 'Dr. Ziauddin Hospital Clifton - Clifton', searchText: 'Dr. Ziauddin Hospital Clifton, Karachi, Pakistan' },
    { name: 'Dr. Ziauddin Hospital North Nazimabad - North Nazimabad', searchText: 'Dr. Ziauddin Hospital North Nazimabad, Karachi, Pakistan' },
    { name: 'Kharadar General Hospital - Kharadar / Aga Khan Road', searchText: 'Kharadar General Hospital, Karachi, Pakistan' },
    { name: 'Indus Hospital Korangi Campus - Korangi Crossing', searchText: 'Indus Hospital Korangi Crossing, Karachi, Pakistan' },
    { name: 'Indus Sheikh Saeed Memorial Campus - Gulshan-e-Sikander, Korangi', searchText: 'Indus Hospital Sheikh Saeed Memorial Campus, Korangi, Karachi, Pakistan' },

    { name: 'KGS Junior Section - Clifton Block 5', searchText: 'Karachi Grammar School Junior Section, Karachi, Pakistan' },
    { name: 'KGS College Section - Clifton Block 5', searchText: 'Karachi Grammar School College Section, Karachi, Pakistan' },
    { name: 'KGS Middle Section - Depot Lines / Saddar', searchText: 'Karachi Grammar School Middle Section, Karachi, Pakistan' },
    { name: 'Nixor College Clifton Campus - Clifton Block 1', searchText: 'Nixor College Clifton Campus, Karachi, Pakistan' },
    { name: 'Nixor College Bahadurabad Campus - Cutchi Memon CHS / Bahadurabad', searchText: 'Nixor College Bahadurabad Campus, Karachi, Pakistan' },
    { name: 'Cedar PECHS Campus - Memon Society / PECHS', searchText: 'Cedar College PECHS Campus, Karachi, Pakistan' },
    { name: 'Cedar Primary Clifton Campus - Clifton Block 4', searchText: 'Cedar Primary Clifton Campus, Karachi, Pakistan' },
    { name: 'Cedar Lower Secondary Clifton Campus - Clifton Block 9', searchText: 'Cedar Lower Secondary Clifton Campus, Karachi, Pakistan' },
    { name: 'Cedar Higher Secondary Clifton Campus - Clifton Block 9', searchText: 'Cedar Higher Secondary Clifton Campus, Karachi, Pakistan' },
    { name: 'Bay View Academy Defence Campus - DHA Phase VIII', searchText: 'Bay View Academy, DHA Phase 8, Karachi, Pakistan' },
    { name: 'Beaconhouse Clifton Campus - Clifton', searchText: 'Beaconhouse Clifton Campus, Karachi, Pakistan' },
    { name: 'Beaconhouse PECHS Campus - PECHS', searchText: 'Beaconhouse PECHS Campus, Karachi, Pakistan' },
    { name: 'Beaconhouse Elementary Campus PECHS - KAECHS / PECHS Block 1', searchText: 'Beaconhouse Elementary Campus PECHS, Karachi, Pakistan' },
    { name: 'Beaconhouse BCP North Nazimabad Campus - North Nazimabad', searchText: 'Beaconhouse BCP North Nazimabad Campus, Karachi, Pakistan' },
    { name: 'Beaconhouse North Nazimabad Primary I - North Nazimabad Block B', searchText: 'Beaconhouse North Nazimabad Primary I, Karachi, Pakistan' },
    { name: 'Beaconhouse North Nazimabad Primary II - North Nazimabad', searchText: 'Beaconhouse North Nazimabad Primary II, Karachi, Pakistan' },
    { name: 'Beaconhouse North Nazimabad KG - North Nazimabad', searchText: 'Beaconhouse North Nazimabad KG, Karachi, Pakistan' },
    { name: 'Beaconhouse North Nazimabad Cambridge - North Nazimabad Block F', searchText: 'Beaconhouse North Nazimabad Cambridge, Karachi, Pakistan' },

    { name: 'Xanders Clifton - Clifton Block 4', searchText: 'Xanders Clifton, Karachi, Pakistan' },
    { name: 'Xanders DHA Bukhari - DHA Phase VI, Bukhari Commercial', searchText: 'Xanders Bukhari Commercial, DHA Phase 6, Karachi, Pakistan' },
    { name: 'Xanders KDA - Tipu Sultan Road / PECHS side', searchText: 'Xanders KDA, Karachi, Pakistan' },
    { name: 'Kababjees Do Darya - DHA Phase VIII / Do Darya', searchText: 'Kababjees Do Darya, Karachi, Pakistan' },
    { name: 'Kababjees Highway - Super Highway / M-9 side', searchText: 'Kababjees Highway, Karachi, Pakistan' },
    { name: 'Del Frio SMCHS - SMCHS Block A', searchText: 'Del Frio SMCHS, Karachi, Pakistan' },
    { name: 'Del Frio Gulshan - Gulshan-e-Iqbal Block 4', searchText: 'Del Frio Gulshan, Karachi, Pakistan' },
    { name: 'Ginsoy Shahbaz - DHA Phase VI, Khyaban-e-Shahbaz', searchText: 'Ginsoy Khyaban-e-Shahbaz, DHA Karachi, Pakistan' },
    { name: 'Ginsoy Seher - DHA Phase VI, Khyaban-e-Seher', searchText: 'Ginsoy Khyaban-e-Seher, DHA Karachi, Pakistan' },

    { name: 'HP - Shell Askari Service Station - Rashid Minhas Road / Askari IV side', searchText: 'HP Shell Askari Service Station, Karachi, Pakistan' },
    { name: 'Star Gate Filling Station - Shahrah-e-Faisal / Airport side', searchText: 'Star Gate Filling Station, Shahrah-e-Faisal, Karachi, Pakistan' },
    { name: 'HP - Malik Service Station - Shahrah-e-Faisal', searchText: 'HP Malik Service Station, Shahrah-e-Faisal, Karachi, Pakistan' },
    { name: 'HP - Airways 1 Petroleum Service - Shahrah-e-Faisal', searchText: 'HP Airways 1 Petroleum Service, Shahrah-e-Faisal, Karachi, Pakistan' },
    { name: 'HP - Crystal Petroleum Service - Tipu Sultan Road / Shahrah-e-Faisal', searchText: 'HP Crystal Petroleum Service, Karachi, Pakistan' },
    { name: 'HP - Central Service Station - Enquiry Office Road / old city side', searchText: 'HP Central Service Station, Karachi, Pakistan' },

    { name: 'Dolmen Mall Hyderi - North Nazimabad / Hyderi', searchText: 'Dolmen Mall Hyderi, Karachi, Pakistan' },
    { name: 'Park Towers - Clifton Block 5', searchText: 'Park Towers Clifton, Karachi, Pakistan' },
    { name: 'McDonalds Boat Basin - Clifton Block 5', searchText: 'McDonalds Boat Basin, Karachi, Pakistan' },
    { name: 'KFC Boat Basin - Clifton Block 5', searchText: 'KFC Boat Basin, Karachi, Pakistan' },
    { name: 'Ayesha Manzil - Federal B Area', searchText: 'Ayesha Manzil, Karachi, Pakistan' },
    { name: 'Five Star Chowrangi - North Nazimabad', searchText: 'Five Star Chowrangi, North Nazimabad, Karachi, Pakistan' },
    { name: 'Karsaz - Shahrah-e-Faisal / Karsaz corridor', searchText: 'Karsaz, Karachi, Pakistan' },
    { name: 'Baloch Colony Bridge - Shahrah-e-Faisal connector', searchText: 'Baloch Colony Bridge, Karachi, Pakistan' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocodeOne(query) {
    const url = new URL('/search', GEOCODER_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'pk');

    const response = await fetch(url, {
        headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            ...(NOMINATIM_EMAIL ? { From: NOMINATIM_EMAIL } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${query}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
        throw new Error(`No result for ${query}`);
    }

    return {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
        label: results[0].display_name,
    };
}

async function run() {
    const output = [];
    const unresolved = [];

    for (const place of PLACES) {
        try {
            const result = await geocodeOne(place.searchText);
            output.push({
                name: place.name,
                lat: result.lat,
                lng: result.lng,
            });
            console.log(`OK  ${place.name} -> ${result.lat}, ${result.lng}`);
        } catch (err) {
            unresolved.push({
                name: place.name,
                searchText: place.searchText,
                error: err.message,
            });
            console.log(`ERR ${place.name} -> ${err.message}`);
        }

        await sleep(1100);
    }

    const fileText = `module.exports = ${JSON.stringify(output, null, 2)};\n`;
    await fs.writeFile('src/data/landmarks.js', fileText, 'utf8');

    if (unresolved.length > 0) {
        await fs.writeFile(
            'src/data/landmarks.unresolved.json',
            JSON.stringify(unresolved, null, 2),
            'utf8'
        );
    }

    console.log(`\nDone. Wrote ${output.length} landmarks to src/data/landmarks.js`);
    if (unresolved.length > 0) {
        console.log(`Also wrote ${unresolved.length} unresolved items to src/data/landmarks.unresolved.json`);
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});