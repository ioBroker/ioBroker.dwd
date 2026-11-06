import{createRoot as e,jsx as t,jsxs as n}from"../../../lib/esm/react-19.js";var r=`iob-dialog-close`;function i(e){return!!e.form}var a=[`header`,`staticText`,`divider`];function o(e,t){return e==null?``:typeof e==`object`?e[t]||e.en||Object.values(e).find(e=>!!e)||``:String(e)}function s(e){let t={};for(let[n,r]of Object.entries(e.items||{}))r&&!a.includes(r.type)&&(t[n]=r.type);return t}function c(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?e.toString():JSON.stringify(e)}function l(e,t){if(t!=null)switch(e){case`number`:case`slider`:{if(typeof t==`number`)return Number.isFinite(t)?t:void 0;let e=c(t).trim().replace(`,`,`.`);if(!e)return;let n=Number(e);return Number.isFinite(n)?n:void 0}case`checkbox`:return t===!0||t===`true`||t===1||t===`1`;default:return c(t)}}function u(e,t){let n={};for(let[r,i]of Object.entries(e)){let e=l(i,t[r]);e!==void 0&&(n[r]=e)}return n}var d=`"Roboto", "Helvetica", "Arial", sans-serif`,f=Object.freeze({type:`light`,primary:`#3399CC`,primaryContrast:`#FFFFFF`,secondary:`#164477`,secondaryContrast:`#FFFFFF`,background:`#FFFFFF`,paper:`#FFFFFF`,text:`rgba(0, 0, 0, 0.87)`,textSecondary:`rgba(0, 0, 0, 0.6)`,divider:`rgba(0, 0, 0, 0.12)`,error:`#D32F2F`,warning:`#ED6C02`,info:`#0288D1`,success:`#2E7D32`,fontFamily:d,fontSize:14,borderRadius:4}),p=Object.freeze({type:`dark`,primary:`#4DABF5`,primaryContrast:`rgba(0, 0, 0, 0.87)`,secondary:`#436A93`,secondaryContrast:`#FFFFFF`,background:`#121212`,paper:`#121212`,text:`#FFFFFF`,textSecondary:`rgba(255, 255, 255, 0.7)`,divider:`rgba(255, 255, 255, 0.12)`,error:`#F44336`,warning:`#FFA726`,info:`#29B6F6`,success:`#66BB6A`,fontFamily:d,fontSize:14,borderRadius:4}),m=[`primary`,`primaryContrast`,`secondary`,`secondaryContrast`,`background`,`paper`,`text`,`textSecondary`,`divider`,`error`,`warning`,`info`,`success`,`fontFamily`],h=[`fontSize`,`borderRadius`];function g(e){return{...e===`dark`?p:f}}function _(e){if(!e||typeof e!=`object`)return g(typeof e==`string`?e:`light`);let t=e,n=g(typeof t.type==`string`?t.type:`light`);for(let e of m){let r=t[e];typeof r==`string`&&r.trim()&&(n[e]=r.trim())}for(let e of h){let r=t[e],i=typeof r==`string`?parseFloat(r):r;typeof i==`number`&&Number.isFinite(i)&&i>=0&&(n[e]=i)}return n}function v(e,t){return e.type===t.type&&m.every(n=>e[n]===t[n])&&h.every(n=>e[n]===t[n])}function y(e){return`--iob-${e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}`}function b(e){let t={};for(let n of m)t[y(n)]=e[n];for(let n of h)t[y(n)]=`${e[n]}px`;return t[`color-scheme`]=e.type,t}var x={ok:{en:`OK`,"zh-cn":`确定`},cancel:{en:`Cancel`,de:`Abbrechen`,ru:`Отмена`,pt:`Cancelar`,nl:`Annuleren`,fr:`Annuler`,it:`Annulla`,es:`Cancelar`,pl:`Anuluj`,uk:`Скасувати`,"zh-cn":`取消`},close:{en:`Close`,de:`Schließen`,ru:`Закрыть`,pt:`Fechar`,nl:`Sluiten`,fr:`Fermer`,it:`Chiudi`,es:`Cerrar`,pl:`Zamknij`,uk:`Закрити`,"zh-cn":`关闭`}},S=`
dialog {
    box-sizing: border-box;
    width: 480px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    padding: 0;
    border: 0;
    border-radius: calc(var(--iob-border-radius) * 2);
    background: var(--iob-paper);
    color: var(--iob-text);
    font-family: var(--iob-font-family);
    font-size: var(--iob-font-size);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
/* as the dialogs of MUI: a dark paper gets lighter the higher it lies */
dialog.dark { background-image: linear-gradient(rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.16)); }
dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
dialog:focus { outline: none; }
form { display: flex; flex-direction: column; height: 100%; max-height: inherit; margin: 0; }
header { display: flex; align-items: center; gap: 8px; padding: 12px 8px 12px 16px; font-size: 1.15em; font-weight: 500; }
header span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.body { flex: 1; min-height: 0; padding: 0 16px 16px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 16px 16px; }
button { font: inherit; padding: 6px 16px; border-radius: var(--iob-border-radius); border: 1px solid var(--iob-primary); background: transparent; color: var(--iob-primary); cursor: pointer; }
button.primary { background: var(--iob-primary); color: var(--iob-primary-contrast); }
button.close { border: 0; padding: 2px 8px; font-size: 1.4em; line-height: 1; color: var(--iob-text-secondary); }
label { display: flex; flex-direction: column; gap: 4px; }
label.check { flex-direction: row; align-items: center; gap: 8px; }
input, select, textarea { font: inherit; accent-color: var(--iob-primary); }
.help { color: var(--iob-text-secondary); font-size: 0.85em; }
h3 { margin: 4px 0 0; font-size: 1em; }
p { margin: 0; }
hr { width: 100%; border: 0; border-top: 1px solid var(--iob-divider); margin: 0; }
[hidden] { display: none !important; }
`;function C(e){if(!e)return null;try{let t=Function(`data`,`return (${e});`);return e=>{try{return!!t(e)}catch{return!1}}}catch{return null}}function w(e){return typeof e==`string`?e:typeof e==`number`||typeof e==`boolean`?String(e):``}function T(e){let{input:t,setting:n}=e;if(t)return t instanceof HTMLInputElement&&t.type===`checkbox`?t.checked:t instanceof HTMLSelectElement?n.options?.[t.selectedIndex]?.value:t.value}function E(e,t,n,r,i){let a={name:t,setting:n,box:e.createElement(`div`),hidden:C(n.hidden),disabled:C(n.disabled)},s=o(n.label,i);switch(n.type){case`header`:return a.box=e.createElement(`h3`),a.box.textContent=o(n.text,i)||s,a;case`staticText`:return a.box=e.createElement(`p`),a.box.textContent=o(n.text,i)||s,a;case`divider`:return a.box=e.createElement(`hr`),a}let c=e.createElement(`label`);a.box=c;let l=e.createElement(`span`);if(l.textContent=s||t,n.type===`checkbox`){let t=e.createElement(`input`);t.type=`checkbox`,t.checked=r===!0||r===`true`,c.className=`check`,c.append(t,l),a.input=t}else if(n.type===`select`){let t=e.createElement(`select`);for(let r of n.options||[]){let n=e.createElement(`option`);n.textContent=o(r.label,i),t.append(n)}let s=(n.options||[]).findIndex(e=>String(e.value)===w(r));t.selectedIndex=s===-1?0:s,c.append(l,t),a.input=t}else if(n.type===`text`&&(n.minRows||1)>1){let t=e.createElement(`textarea`);t.rows=n.minRows||2,t.value=w(r),c.append(l,t),a.input=t}else{let t=e.createElement(`input`),i=w(r);switch(n.type){case`number`:case`slider`:t.type=n.type===`slider`?`range`:`number`,n.min!==void 0&&(t.min=String(n.min)),n.max!==void 0&&(t.max=String(n.max)),t.step=n.step===void 0?`any`:String(n.step);break;case`password`:t.type=`password`;break;case`color`:t.type=!i||/^#[0-9a-f]{6}$/i.test(i)?`color`:`text`;break;default:t.type=`text`}if(t.value=i,t.type===`range`){let n=e.createElement(`output`);n.textContent=t.value,t.addEventListener(`input`,()=>n.textContent=t.value),l.append(`: `,n)}c.append(l,t),a.input=t}if(n.help){let t=e.createElement(`span`);t.className=`help`,t.textContent=o(n.help,i),c.append(t)}return a}function D(e,t={}){let n=t.lang||`en`,a=document,c=e=>x[e][n]||x[e].en||e,l=a.createElement(`div`);l.setAttribute(`data-iob-dialog`,``);let d=l.attachShadow({mode:`open`}),f=a.createElement(`style`);f.textContent=S;let p=a.createElement(`dialog`),m=_(t.theme);p.className=m.type===`dark`?`dark`:``;for(let[e,t]of Object.entries(b(m)))p.style.setProperty(e,t);e.width&&(p.style.width=`${e.width}px`),e.height&&(p.style.height=`${e.height}px`);let h=a.createElement(`form`),g=a.createElement(`header`),v=a.createElement(`span`);v.textContent=o(e.title,n);let y=a.createElement(`button`);y.type=`button`,y.className=`close`,y.title=c(`close`),y.setAttribute(`aria-label`,c(`close`)),y.textContent=`×`,g.append(v,y);let C=a.createElement(`div`);return C.className=`body`,h.append(g,C),p.append(h),d.append(f,p),new Promise(t=>{let f=!1,m=e=>{f||(f=!0,p.open&&p.close(),l.remove(),t(e))};if(y.addEventListener(`click`,()=>m(null)),p.addEventListener(`close`,()=>m(null)),h.addEventListener(`submit`,e=>e.preventDefault()),i(e)){let t={},r=[];for(let[t,i]of Object.entries(e.form.items||{})){let o=e.data?.[t]??i.default,s=E(a,t,i,o,n);r.push(s),C.append(s.box)}let i=()=>{for(let e of r)e.input&&(t[e.name]=T(e));return t},l=()=>{let e=i();for(let t of r)t.box.hidden=t.hidden?t.hidden(e):!1,t.input&&(t.input.disabled=t.disabled?t.disabled(e):!1)};h.addEventListener(`input`,l),h.addEventListener(`change`,l),l();let d=r.find(e=>e.input&&!e.box.hidden&&!e.input.disabled);d?.input&&(d.input.autofocus=!0);let f=a.createElement(`footer`),p=a.createElement(`button`);p.type=`button`,p.textContent=o(e.cancel,n)||c(`cancel`),p.addEventListener(`click`,()=>m(null));let g=a.createElement(`button`);g.type=`submit`,g.className=`primary`,g.textContent=o(e.ok,n)||c(`ok`),f.append(p,g),h.append(f),h.addEventListener(`submit`,()=>m(u(s(e.form),i())))}else C.append(e.element),p.addEventListener(r,e=>m(e.detail??null));a.body.append(l),p.showModal(),d.activeElement&&d.activeElement!==y||(p.tabIndex=-1,p.focus())})}function O(e){return[...new Set(e.filter(e=>typeof e==`string`&&!!e))]}var k=[`socket`,`dialogs`,`theme`,`editMode`,`settings`,`value`],A=class extends HTMLElement{states={};objects={};#e=null;#t={};#n=_(`light`);#r=!1;#i=null;#a=void 0;#o=null;#s=!1;#c=(e,t)=>{this.#o?.states.includes(e)&&(this.states[e]=t||null,this.#_())};#l=(e,t)=>{this.#o?.objects.includes(e)&&(this.objects[e]=t||null,this.#d())};get socket(){return this.#e}set socket(e){this.#e=e||null,this.#d()}get settings(){return this.#t}set settings(e){this.#t=e||{},this.#d()}get theme(){return this.#n}set theme(e){let t=_(e);v(t,this.#n)||(this.#n=t,this.#u(),this.#_())}get editMode(){return this.#r}set editMode(e){let t=!!e;t!==this.#r&&(this.#r=t,this.#_())}get dialogs(){return this.#i}set dialogs(e){this.#i=e||null}get value(){return this.#a}set value(e){e!==this.#a&&(this.#a=e,this.#_())}connectedCallback(){for(let e of k)if(Object.prototype.hasOwnProperty.call(this,e)){let t=this[e];delete this[e],this[e]=t}this.#u(),this.#d()}disconnectedCallback(){this.#g()}getStateIds(e){return[]}getObjectIds(e){return[]}get systemLang(){return this.#e?.systemLang||`en`}text(e){return o(e,this.systemLang)}setState(e,t){return this.#e&&!this.#r?this.#e.setState(e,t):Promise.resolve()}changeValue(e){return this.#r||this.emit(`iob-change`,e)?!1:(this.value=e,!0)}emit(e,t){return this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0,cancelable:!0}))}async openDialog(e){if(this.#r)return null;let t=this.#i?await this.#i.open(e):await D(e,{lang:this.systemLang,theme:this.#n});return i(e)?t&&typeof t==`object`?u(s(e.form),t):null:t??null}#u(){for(let[e,t]of Object.entries(b(this.#n)))this.style.setProperty(e,t)}#d(){if(!this.isConnected)return;let e=this.#e,t=e?O(this.getStateIds(this.#t)):[],n=e?O(this.getObjectIds(this.#t)):[];this.#o&&this.#o.socket!==e&&this.#g();let r=this.#o?.states||[],i=this.#o?.objects||[],a=r.filter(e=>!t.includes(e)),o=i.filter(e=>!n.includes(e)),s=t.filter(e=>!r.includes(e)),c=n.filter(e=>!i.includes(e));e&&a.length&&e.unsubscribeState(a,this.#c),e&&o.length&&this.#h(e,o);for(let e of a)delete this.states[e];for(let e of[...a,...o])!t.includes(e)&&!n.includes(e)&&delete this.objects[e];this.#o=e&&(t.length||n.length)?{socket:e,states:t,objects:n}:null,e&&s.length&&this.#p(e,s),e&&c.length&&this.#m(e,c),this.#_()}#f(e,t,n){return this.#o?.socket===e&&this.#o[t].includes(n)}#p(e,t){e.subscribeState(t,this.#c).catch(e=>console.warn(`<${this.localName}>: cannot subscribe ${t.join(`, `)}: ${e}`));for(let n of t)e.getState(n).then(t=>{this.#f(e,`states`,n)&&this.states[n]===void 0&&(this.states[n]=t||null,this.#_())}).catch(()=>{}),e.getObject(n).then(t=>{this.#f(e,`states`,n)&&!this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#_())}).catch(()=>{})}#m(e,t){e.subscribeObject(t,this.#l).catch(e=>console.warn(`<${this.localName}>: cannot subscribe the objects ${t.join(`, `)}: ${e}`));for(let n of t)e.getObject(n).then(t=>{this.#f(e,`objects`,n)&&(this.objects[n]=t||null,this.#d())}).catch(()=>{})}#h(e,t){e.unsubscribeObject(t,this.#l).catch(()=>{})}#g(){if(this.#o){let{socket:e,states:t,objects:n}=this.#o;t.length&&e.unsubscribeState(t,this.#c),n.length&&this.#h(e,n),this.#o=null}this.states={},this.objects={}}#_(){this.#s||(this.#s=!0,queueMicrotask(()=>{this.#s=!1,this.isConnected&&this.render()}))}};function j(e,t){let n=typeof e==`string`?e:e.tag;customElements.get(n)||customElements.define(n,t)}var M=`iob-dwd-warnings`,N=[`text`,`headline`,`description`,`instruction`,`severity`,`begin`,`end`];function P(e){let t=(e==null?``:String(e).trim()).match(/^(?:(?:system\.adapter\.)?dwd\.)?(\d+)$/);return t?parseInt(t[1],10):null}function F(e){let t=P(e.instance);if(t===null)return null;let n=Math.min(9,Math.max(0,Math.floor(Number(e.warning)||0)));return`dwd.${t}.${e.source===`warncell`?`warncell.`:``}warning${n||``}`}var I={noWarning:`No warning`,chooseInstance:`Choose a DWD instance in the settings`,noChannel:`Not created by the adapter: raise the number of warnings in its instance settings`,noWarncell:`No warncell ID is set in the instance settings`,details:`Show the whole warning`},L={en:I,de:{noWarning:`Keine Warnung`,chooseInstance:`DWD-Instanz in den Einstellungen wählen`,noChannel:`Vom Adapter nicht angelegt: Anzahl der Warnungen in den Instanzeinstellungen erhöhen`,noWarncell:`In den Instanzeinstellungen ist keine Warnzellen-ID gesetzt`,details:`Ganze Warnung anzeigen`},ru:{noWarning:`Нет предупреждений`,chooseInstance:`Выберите экземпляр DWD в настройках`,noChannel:`Адаптер не создаёт это предупреждение: увеличьте количество предупреждений в настройках экземпляра`,noWarncell:`В настройках экземпляра не задан ID ячейки предупреждений`,details:`Показать всё предупреждение`},pt:{noWarning:`Sem aviso`,chooseInstance:`Escolha uma instância do DWD nas configurações`,noChannel:`Não criado pelo adaptador: aumente o número de avisos nas configurações da instância`,noWarncell:`Nenhum ID da célula de aviso definido nas configurações da instância`,details:`Mostrar o aviso completo`},nl:{noWarning:`Geen waarschuwing`,chooseInstance:`Kies een DWD-instantie in de instellingen`,noChannel:`Niet aangemaakt door de adapter: verhoog het aantal waarschuwingen in de instantie-instellingen`,noWarncell:`Er is geen waarschuwingscel-ID ingesteld in de instantie-instellingen`,details:`Volledige waarschuwing tonen`},fr:{noWarning:`Aucune alerte`,chooseInstance:`Choisissez une instance DWD dans les paramètres`,noChannel:`Non créée par l'adaptateur : augmentez le nombre d'alertes dans les paramètres de l'instance`,noWarncell:`Aucun ID de cellule d'alerte n'est défini dans les paramètres de l'instance`,details:`Afficher l'alerte complète`},it:{noWarning:`Nessun avviso`,chooseInstance:`Scegli un'istanza DWD nelle impostazioni`,noChannel:`Non creato dall'adattatore: aumenta il numero di avvisi nelle impostazioni dell'istanza`,noWarncell:`Nessun ID cella di allerta impostato nelle impostazioni dell'istanza`,details:`Mostra l'avviso completo`},es:{noWarning:`Sin aviso`,chooseInstance:`Elija una instancia de DWD en la configuración`,noChannel:`El adaptador no lo crea: aumente el número de avisos en la configuración de la instancia`,noWarncell:`No hay ningún ID de celda de aviso en la configuración de la instancia`,details:`Mostrar el aviso completo`},pl:{noWarning:`Brak ostrzeżeń`,chooseInstance:`Wybierz instancję DWD w ustawieniach`,noChannel:`Nie utworzone przez adapter: zwiększ liczbę ostrzeżeń w ustawieniach instancji`,noWarncell:`W ustawieniach instancji nie ustawiono ID komórki ostrzeżeń`,details:`Pokaż całe ostrzeżenie`},uk:{noWarning:`Немає попереджень`,chooseInstance:`Виберіть екземпляр DWD у налаштуваннях`,noChannel:`Адаптер не створює це попередження: збільште кількість попереджень у налаштуваннях екземпляра`,noWarncell:`У налаштуваннях екземпляра не задано ID комірки попереджень`,details:`Показати все попередження`},"zh-cn":{noWarning:`无警告`,chooseInstance:`请在设置中选择 DWD 实例`,noChannel:`适配器未创建此警告：请在实例设置中增加警告数量`,noWarncell:`实例设置中未设置预警单元 ID`,details:`显示完整警告`}};function R(e,t){return L[e]?.[t]||I[t]}var z=`
:host {
    display: block;
    width: 100%;
    height: 100%;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
}
.box {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: clamp(2px, 4cqmin, 8px);
    overflow: hidden;
    font-size: clamp(11px, 15cqmin, 16px);
    line-height: 1.3;
    -webkit-tap-highlight-color: transparent;
}
.box.edit {
    pointer-events: none;
}
.title {
    flex: none;
    font-weight: 600;
    font-size: 0.85em;
    color: var(--iob-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.band {
    flex: 1 1 auto;
    min-height: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    padding: clamp(3px, 6cqmin, 10px) clamp(4px, 8cqmin, 14px);
    border-radius: calc(var(--iob-border-radius) * 2);
    overflow: hidden;
    outline: none;
}
.band.plain {
    border: 1px solid var(--iob-divider);
}
.band.clickable {
    cursor: pointer;
}
.band.clickable:focus-visible {
    box-shadow:
        0 0 0 2px var(--iob-paper),
        0 0 0 4px var(--iob-primary);
}
.head {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.75em;
    min-width: 0;
}
.headline {
    /* as wide as its text: the period goes below it before the headline is cut */
    flex: 1 1 auto;
    min-width: 0;
    font-weight: 700;
    font-size: 1.2em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.period {
    flex: none;
    font-size: 0.85em;
    opacity: 0.8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}
.body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    /* what does not fit fades out instead of being cut through the middle of a line */
    -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent);
    mask-image: linear-gradient(to bottom, #000 calc(100% - 0.7em), transparent);
}
.instruction {
    font-style: italic;
    opacity: 0.85;
}
.small .band {
    flex-direction: row;
    align-items: center;
    padding: 0 clamp(4px, 20cqh, 12px);
    font-size: clamp(11px, 40cqh, 22px);
    font-weight: 600;
}
.small .text {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.none,
.hint {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    padding: 4px;
    text-align: center;
    color: var(--iob-text-secondary);
    overflow: hidden;
}
.none svg {
    flex: none;
    width: 1.3em;
    height: 1.3em;
    fill: var(--iob-success);
}
.hint {
    font-size: clamp(11px, 10cqmin, 15px);
}
.hint svg {
    flex: none;
    width: 1.5em;
    height: 1.5em;
    fill: currentColor;
}
.small .none,
.small .hint {
    justify-content: flex-start;
    font-size: clamp(11px, 40cqh, 16px);
    white-space: nowrap;
    text-overflow: ellipsis;
}
`,B=`
:host {
    display: block;
}
.details {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--iob-text);
    font-family: var(--iob-font-family);
    font-size: var(--iob-font-size);
    line-height: 1.4;
}
.band {
    padding: 8px 12px;
    border-radius: calc(var(--iob-border-radius) * 2);
}
.band.plain {
    border: 1px solid var(--iob-divider);
}
.headline {
    font-weight: 700;
    font-size: 1.15em;
}
.period {
    margin-top: 2px;
    font-size: 0.9em;
    opacity: 0.85;
    font-variant-numeric: tabular-nums;
}
.instruction {
    padding-left: 10px;
    border-left: 3px solid var(--iob-divider);
    color: var(--iob-text-secondary);
    font-style: italic;
}
p {
    margin: 0;
    white-space: pre-line;
}
`,V={1:`#ffeb3b`,2:`#fb8c00`,3:`#e53935`,4:`#880e4f`,9:`#c99afe`,11:`#c9f`,19:`#fe68fe`,49:`#e966fe`,50:`#f933fe`};function H(e){let t=parseInt(String(e??``),10);return Number.isNaN(t)?``:V[t]||``}function U(e){if(!e)return;let t=e.substring(1);t.length===3&&(t=t.split(``).map(e=>e+e).join(``));let n=parseInt(t.substring(0,2),16),r=parseInt(t.substring(2,4),16),i=parseInt(t.substring(4,6),16);return(n*299+r*587+i*114)/1e3>140?`#000000`:`#ffffff`}function W(e,t){if(e==null||e===``||e===0)return``;let n=typeof e==`number`?e:Number(e),r=new Date(Number.isNaN(n)?String(e):n);if(Number.isNaN(r.getTime()))return``;let i=e=>e<10?`0${e}`:String(e),a={YYYY:String(r.getFullYear()),YY:String(r.getFullYear()).substring(2),MM:i(r.getMonth()+1),DD:i(r.getDate()),hh:i(r.getHours()),mm:i(r.getMinutes()),ss:i(r.getSeconds())};return(t||`DD.MM hh:mm`).replace(/YYYY|YY|MM|DD|hh|mm|ss/g,e=>a[e])}var G=`M12 5.99 19.53 19H4.47zM12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z`,K=`M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8`;function q({path:e}){return/* @__PURE__ */ t(`svg`,{viewBox:`0 0 24 24`,"aria-hidden":`true`,children:/* @__PURE__ */ t(`path`,{d:e})})}function J(e){return e==null?``:String(e)}function Y(e){return!!(J(e.headline)||J(e.text))}function X(e,t){let n=t||`DD.MM hh:mm`;return[W(e.begin,n),W(e.end,n)].filter(Boolean).join(` - `)}function Z(e){let t=H(e.severity);return t?{style:{backgroundColor:t,color:U(t)},plain:!1}:{style:{},plain:!0}}function Q({text:e,small:r}){return/* @__PURE__ */ t(`div`,{className:r?`box small`:`box`,children:/* @__PURE__ */ n(`div`,{className:`hint`,children:[/* @__PURE__ */ t(q,{path:G}),/* @__PURE__ */ t(`span`,{children:e})]})})}function $(e){let{values:r,small:i,word:a}=e,o=[`box`];i&&o.push(`small`),e.editMode&&o.push(`edit`);let s=i?``:e.title;if(!Y(r))return/* @__PURE__ */ n(`div`,{className:o.join(` `),children:[s?/* @__PURE__ */ t(`div`,{className:`title`,children:s}):null,/* @__PURE__ */ n(`div`,{className:`none`,children:[/* @__PURE__ */ t(q,{path:K}),/* @__PURE__ */ t(`span`,{children:a(`noWarning`)})]})]});let c=Z(r),l=!e.editMode,u={className:[`band`,c.plain?`plain`:``,l?`clickable`:``].filter(Boolean).join(` `),style:c.style,title:l?a(`details`):void 0,role:l?`button`:void 0,tabIndex:l?0:void 0,onClick:l?e.onDetails:void 0,onKeyDown:l?t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),e.onDetails())}:void 0};if(i)return/* @__PURE__ */ t(`div`,{className:o.join(` `),children:/* @__PURE__ */ t(`div`,{...u,children:/* @__PURE__ */ t(`span`,{className:`text`,children:J(r.text)||J(r.headline)})})});let d=e.showPeriod?X(r,e.timeFormat):``,f=e.showInstruction?J(r.instruction):``;return/* @__PURE__ */ n(`div`,{className:o.join(` `),children:[s?/* @__PURE__ */ t(`div`,{className:`title`,children:s}):null,/* @__PURE__ */ n(`div`,{...u,children:[/* @__PURE__ */ n(`div`,{className:`head`,children:[/* @__PURE__ */ t(`span`,{className:`headline`,children:J(r.headline)||J(r.text)}),d?/* @__PURE__ */ t(`span`,{className:`period`,children:d}):null]}),/* @__PURE__ */ n(`div`,{className:`body`,children:[J(r.description)?/* @__PURE__ */ t(`div`,{children:J(r.description)}):null,f?/* @__PURE__ */ t(`div`,{className:`instruction`,children:f}):null]})]})]})}function ee({values:e,timeFormat:r,word:i}){if(!Y(e))return/* @__PURE__ */ t(`div`,{className:`details`,children:/* @__PURE__ */ t(`p`,{children:i(`noWarning`)})});let a=Z(e),o=X(e,r);return/* @__PURE__ */ n(`div`,{className:`details`,children:[/* @__PURE__ */ n(`div`,{className:a.plain?`band plain`:`band`,style:a.style,children:[/* @__PURE__ */ t(`div`,{className:`headline`,children:J(e.headline)||J(e.text)}),o?/* @__PURE__ */ t(`div`,{className:`period`,children:o}):null]}),J(e.description)?/* @__PURE__ */ t(`p`,{children:J(e.description)}):null,J(e.instruction)?/* @__PURE__ */ t(`p`,{className:`instruction`,children:J(e.instruction)}):null]})}var te=`dwd-warning-click`;j(M,class extends A{#e;#t=null;constructor(){super();let t=this.attachShadow({mode:`open`}),n=document.createElement(`style`);n.textContent=z;let r=document.createElement(`div`);r.className=`mount`,t.append(n,r),this.#e=e(r)}getStateIds(e){let t=F(e);return t?N.map(e=>`${t}.${e}`):[]}#n=e=>R(this.systemLang,e);#r(e){let t={};for(let n of N)t[n]=this.states[`${e}.${n}`]?.val;return t}render(){this.#e.render(this.#i()),this.#t?.()}#i(){let e=this.settings,n=e.layout===`small`,r=F(e);if(!r)return/* @__PURE__ */ t(Q,{text:this.#n(`chooseInstance`),small:n});if(this.objects[`${r}.headline`]===null){let r=Number(e.warning)||0;return/* @__PURE__ */ t(Q,{text:this.#n(e.source===`warncell`&&!r?`noWarncell`:`noChannel`),small:n})}return!this.socket||this.states[`${r}.headline`]===void 0&&this.states[`${r}.text`]===void 0?/* @__PURE__ */ t(`div`,{className:n?`box small`:`box`}):/* @__PURE__ */ t($,{values:this.#r(r),small:n,title:e.title||``,showPeriod:e.showPeriod!==!1,timeFormat:e.timeFormat,showInstruction:!!e.showInstruction,editMode:this.editMode,word:this.#n,onDetails:()=>void this.#a(r)})}async#a(n){if(this.editMode||this.#t||!this.emit(te,{channel:n}))return;let r=document.createElement(`div`);for(let[e,t]of Object.entries(b(this.theme)))r.style.setProperty(e,t);let i=r.attachShadow({mode:`open`}),a=document.createElement(`style`);a.textContent=B;let o=document.createElement(`div`);i.append(a,o);let s=e(o),c=()=>{let e=F(this.settings)===n?n:null;s.render(/* @__PURE__ */ t(ee,{values:e?this.#r(e):{},timeFormat:this.settings.timeFormat,word:this.#n}))};this.#t=c,c();let l=this.#r(n);try{await this.openDialog({title:J(l.text)||J(l.headline)||void 0,element:r,width:560})}finally{this.#t=null,s.unmount()}}});