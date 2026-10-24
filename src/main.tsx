import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles/tokens.css';
import './styles/components.css';
import './styles/app.css';
import { App } from './app';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
