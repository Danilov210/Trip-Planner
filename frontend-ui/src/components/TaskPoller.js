import React, { useEffect, useState } from 'react';
import axios from 'axios';

function TaskPoller({ requestId, onResult }) {
    const [status, setStatus] = useState('waiting');

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`/api/status/${requestId}`);
                if (res.data.status === 'ready') {
                    clearInterval(interval);
                    onResult(res.data.result);
                }
            } catch (err) {
                console.error(err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [requestId]);

    return <div>Waiting for your trip to be planned...</div>;
}

export default TaskPoller;
