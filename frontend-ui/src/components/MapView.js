import React from 'react';

function MapView({ coordinates }) {
    return (
        <div>
            <h3>Trip Route</h3>
            <p>(Map rendering is placeholder for now)</p>
            <pre>{JSON.stringify(coordinates, null, 2)}</pre>
        </div>
    );
}

export default MapView;
