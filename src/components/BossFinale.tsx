function BossFinale() {
  return (
    <div className="boss-finale-scene medical-finale" aria-live="assertive">
      <div className="medical-finale-lights" aria-hidden="true" />
      <div className="medical-finale-board" aria-hidden="true">
        <span>ROOT</span>
        <span>diagnosis</span>
        <span>suffix</span>
      </div>
      <div className="medical-finale-stage" aria-hidden="true">
        <div className="medical-impact-ring ring-one" />
        <div className="medical-impact-ring ring-two" />
        <div className="medical-word-card card-root">ROOT</div>
        <div className="medical-word-card card-term">TERM</div>
        <div className="medical-word-card card-sterile">STERILE</div>
        <div className="medical-finale-professor">
          <span className="professor-hair" />
          <span className="professor-glasses" />
          <span className="professor-eye professor-eye-left" />
          <span className="professor-eye professor-eye-right" />
          <span className="professor-brow professor-brow-left" />
          <span className="professor-brow professor-brow-right" />
          <span className="professor-mouth" />
          <span className="professor-coat" />
          <span className="professor-tie" />
          <span className="professor-sweat sweat-one" />
          <span className="professor-sweat sweat-two" />
        </div>
        <div className="medical-burger-bonk" />
        <div className="medical-ecg-line" />
        <div className="medical-finale-caption">MEDICAL VOCAB COMBO</div>
      </div>
    </div>
  )
}

export default BossFinale
