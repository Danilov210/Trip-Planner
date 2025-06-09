import React from 'react';

function DayPlan({ day }) {
    return (
        <div>
            <h3>{day.date}</h3>
            <p>{day.description}</p>
            <ul>
                {day.places.map((place, idx) => (
                    <li key={idx}>
                        <h4>{place.name}</h4>
                        <p>{place.details}</p>
                        {place.image && <img src={place.image} alt={place.name} width="300" />}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DayPlan;
