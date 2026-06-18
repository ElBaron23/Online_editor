import React, { useState } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

export default function SettingsModal({ settings, setSettings, onClose }) {
    const { t, language, changeLanguage } = useTranslation();

    // Local form states
    const [localLang, setLocalLang] = useState(language);
    const [localAutoComplete, setLocalAutoComplete] = useState(settings.autoComplete);
    const [localAutoClose, setLocalAutoClose] = useState(settings.autoClose);
    const [localSaveMode, setLocalSaveMode] = useState(settings.autoSaveMode);
    const [localSaveDelay, setLocalSaveDelay] = useState(settings.autoSaveDelay);

    const handleSave = () => {
        changeLanguage(localLang);
        setSettings({
            autoSaveMode: localSaveMode,
            autoSaveDelay: localSaveDelay,
            autoComplete: localAutoComplete,
            autoClose: localAutoClose
        });
        onClose();
    };

    return (
        <div className="modal fade show d-block glass-modal" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content glass-panel border-0 text-light" style={{ background: '#252526' }}>
                    <div className="modal-header border-bottom border-secondary border-opacity-25">
                        <h5 className="modal-title text-light"><i className="fa-solid fa-gear text-primary me-2"></i> <span>{t("editor_settings")}</span></h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body text-light">
                        
                        {/* Language Selection */}
                        <div className="mb-3">
                            <label className="form-label text-light opacity-75">{t("language")}</label>
                            <select className="form-select glass-input text-light" value={localLang} onChange={(e) => setLocalLang(e.target.value)}>
                                <option value="en" className="text-dark">English</option>
                                <option value="ar" className="text-dark">العربية</option>
                                <option value="fr" className="text-dark">Français</option>
                            </select>
                        </div>

                        {/* Autocomplete Toggle */}
                        <div className="mb-3 border-top border-secondary border-opacity-25 pt-3">
                            <label className="form-label text-light opacity-75">{t("autocomplete")}</label>
                            <select className="form-select glass-input text-light" value={localAutoComplete ? 'on' : 'off'} onChange={(e) => setLocalAutoComplete(e.target.value === 'on')}>
                                <option value="on" className="text-dark">On (Show suggestions while typing)</option>
                                <option value="off" className="text-dark">Off (Manual coding only)</option>
                            </select>
                        </div>

                        {/* Autoclose Toggle */}
                        <div className="mb-3 border-top border-secondary border-opacity-25 pt-3">
                            <label className="form-label text-light opacity-75">{t("auto_close_tags")}</label>
                            <select className="form-select glass-input text-light" value={localAutoClose ? 'on' : 'off'} onChange={(e) => setLocalAutoClose(e.target.value === 'on')}>
                                <option value="on" className="text-dark">On (Automatically close &lt;tag&gt; and {`{brackets}`})</option>
                                <option value="off" className="text-dark">Off (I will close them myself)</option>
                            </select>
                        </div>

                        {/* Autosave Mode */}
                        <div className="mb-3 border-top border-secondary border-opacity-25 pt-3">
                            <label className="form-label text-light opacity-75">{t("auto_save")}</label>
                            <select className="form-select glass-input text-light" value={localSaveMode} onChange={(e) => setLocalSaveMode(e.target.value)}>
                                <option value="instant" className="text-dark">Instant (Default)</option>
                                <option value="delay" className="text-dark">Delayed (On Pause)</option>
                                <option value="off" className="text-dark">Off (Manual Save only)</option>
                            </select>
                        </div>

                        {/* Autosave Delay */}
                        {localSaveMode === 'delay' && (
                            <div className="mb-3">
                                <label className="form-label text-light opacity-75">{t("auto_save_delay")}</label>
                                <input
                                    type="number"
                                    className="form-control glass-input text-light"
                                    value={localSaveDelay}
                                    onChange={(e) => setLocalSaveDelay(parseInt(e.target.value) || 1000)}
                                    min="500"
                                    step="100"
                                />
                                <small className="text-muted">Time to wait after you stop typing before saving.</small>
                            </div>
                        )}

                        {localSaveMode === 'off' && (
                            <div className="alert alert-warning bg-warning bg-opacity-10 border-warning border-opacity-25 text-warning py-2 mt-3">
                                <i className="fa-solid fa-triangle-exclamation me-1"></i> Auto Save is off. You must click "Run Project" or use Ctrl+S to save your progress.
                            </div>
                        )}
                        
                    </div>
                    <div className="modal-footer border-top border-secondary border-opacity-25">
                        <button type="button" className="btn btn-secondary bg-opacity-25 text-white" onClick={onClose}>{t("cancel")}</button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>{t("save_settings")}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
