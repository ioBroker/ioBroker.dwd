/**
 * The words the element shows, in the languages of ioBroker. `noWarning` is `dwddm_no_warning` of the devices tile
 * (`src-devices/src/i18n/`), the warncell is called as in the instance settings (`admin/i18n/`).
 */
const EN = {
    noWarning: 'No warning',
    chooseInstance: 'Choose a DWD instance in the settings',
    noChannel: 'Not created by the adapter: raise the number of warnings in its instance settings',
    noWarncell: 'No warncell ID is set in the instance settings',
    details: 'Show the whole warning',
};

export type WordKey = keyof typeof EN;

const WORDS: Record<string, Record<WordKey, string>> = {
    en: EN,
    de: {
        noWarning: 'Keine Warnung',
        chooseInstance: 'DWD-Instanz in den Einstellungen wählen',
        noChannel: 'Vom Adapter nicht angelegt: Anzahl der Warnungen in den Instanzeinstellungen erhöhen',
        noWarncell: 'In den Instanzeinstellungen ist keine Warnzellen-ID gesetzt',
        details: 'Ganze Warnung anzeigen',
    },
    ru: {
        noWarning: 'Нет предупреждений',
        chooseInstance: 'Выберите экземпляр DWD в настройках',
        noChannel: 'Адаптер не создаёт это предупреждение: увеличьте количество предупреждений в настройках экземпляра',
        noWarncell: 'В настройках экземпляра не задан ID ячейки предупреждений',
        details: 'Показать всё предупреждение',
    },
    pt: {
        noWarning: 'Sem aviso',
        chooseInstance: 'Escolha uma instância do DWD nas configurações',
        noChannel: 'Não criado pelo adaptador: aumente o número de avisos nas configurações da instância',
        noWarncell: 'Nenhum ID da célula de aviso definido nas configurações da instância',
        details: 'Mostrar o aviso completo',
    },
    nl: {
        noWarning: 'Geen waarschuwing',
        chooseInstance: 'Kies een DWD-instantie in de instellingen',
        noChannel: 'Niet aangemaakt door de adapter: verhoog het aantal waarschuwingen in de instantie-instellingen',
        noWarncell: 'Er is geen waarschuwingscel-ID ingesteld in de instantie-instellingen',
        details: 'Volledige waarschuwing tonen',
    },
    fr: {
        noWarning: 'Aucune alerte',
        chooseInstance: 'Choisissez une instance DWD dans les paramètres',
        noChannel: "Non créée par l'adaptateur : augmentez le nombre d'alertes dans les paramètres de l'instance",
        noWarncell: "Aucun ID de cellule d'alerte n'est défini dans les paramètres de l'instance",
        details: "Afficher l'alerte complète",
    },
    it: {
        noWarning: 'Nessun avviso',
        chooseInstance: "Scegli un'istanza DWD nelle impostazioni",
        noChannel: "Non creato dall'adattatore: aumenta il numero di avvisi nelle impostazioni dell'istanza",
        noWarncell: "Nessun ID cella di allerta impostato nelle impostazioni dell'istanza",
        details: "Mostra l'avviso completo",
    },
    es: {
        noWarning: 'Sin aviso',
        chooseInstance: 'Elija una instancia de DWD en la configuración',
        noChannel: 'El adaptador no lo crea: aumente el número de avisos en la configuración de la instancia',
        noWarncell: 'No hay ningún ID de celda de aviso en la configuración de la instancia',
        details: 'Mostrar el aviso completo',
    },
    pl: {
        noWarning: 'Brak ostrzeżeń',
        chooseInstance: 'Wybierz instancję DWD w ustawieniach',
        noChannel: 'Nie utworzone przez adapter: zwiększ liczbę ostrzeżeń w ustawieniach instancji',
        noWarncell: 'W ustawieniach instancji nie ustawiono ID komórki ostrzeżeń',
        details: 'Pokaż całe ostrzeżenie',
    },
    uk: {
        noWarning: 'Немає попереджень',
        chooseInstance: 'Виберіть екземпляр DWD у налаштуваннях',
        noChannel: 'Адаптер не створює це попередження: збільште кількість попереджень у налаштуваннях екземпляра',
        noWarncell: 'У налаштуваннях екземпляра не задано ID комірки попереджень',
        details: 'Показати все попередження',
    },
    'zh-cn': {
        noWarning: '无警告',
        chooseInstance: '请在设置中选择 DWD 实例',
        noChannel: '适配器未创建此警告：请在实例设置中增加警告数量',
        noWarncell: '实例设置中未设置预警单元 ID',
        details: '显示完整警告',
    },
};

/**
 * A word in the language of the system, English if there is none in it
 *
 * @param lang the language of the ioBroker system
 * @param key the word
 */
export function getWord(lang: string, key: WordKey): string {
    return WORDS[lang]?.[key] || EN[key];
}
