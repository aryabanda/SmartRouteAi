import {useEffect, useState} from 'react';

import {getCurrentLocation} from '../services/location';

export default function useLocation() {

    const [location, setLocation] = useState<any>();

    useEffect(() => {

        getCurrentLocation()
            .then(setLocation)
            .catch(console.log);

    }, []);

    return location;
}