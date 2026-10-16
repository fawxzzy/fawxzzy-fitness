import React from 'react';
import {createRoot} from 'react-dom/client';
import {LoginScreen} from './LoginScreen';
(window as any).__submissions=[];
createRoot(document.getElementById('root')!).render(<LoginScreen previewShowCredentialStep={true}/>);
