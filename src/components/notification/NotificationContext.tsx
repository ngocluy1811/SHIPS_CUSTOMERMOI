import React, { createContext, useContext } from 'react';

export const NotificationContext = createContext<{ notifications: any[] }>({ notifications: [] });

export const useNotifications = () => useContext(NotificationContext); 