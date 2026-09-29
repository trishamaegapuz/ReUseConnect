import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  Check,
  CircleCheck,
  CloudUpload,
  Leaf,
  Recycle,
  RefreshCw,
  Search,
  Sprout,
  TreePine,
  X
} from 'lucide-react';

import {
  calculateReuseImpact,
  getReuseToolsData,
  submitConditionCheck
} from '../../services/seller/sellerReuseToolsService';

import '../../styles/seller/SellerReuseTools.css';


// ============================================================
// HELPERS
// ============================================================

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }
  );
};


const conditionClass = (
  condition = ''
) => {
  const value =
    String(condition).toLowerCase();

  if (
    value.includes('good') ||
    value.includes('excellent') ||
    value.includes('like')
  ) {
    return 'good';
  }

  if (value.includes('fair')) {
    return 'fair';
  }

  return 'needs';
};


const getConditionScore = (
  answers
) => {
  let score = 0;

  if (
    answers.damage === 'none'
  ) {
    score += 3;
  }

  if (
    answers.damage === 'minor'
  ) {
    score += 2;
  }

  if (
    answers.damage === 'major'
  ) {
    score += 0;
  }

  if (
    answers.function === 'fully'
  ) {
    score += 3;
  }

  if (
    answers.function === 'partly'
  ) {
    score += 1;
  }

  if (
    answers.function === 'not'
  ) {
    score += 0;
  }

  if (
    answers.appearance === 'excellent'
  ) {
    score += 2;
  }

  if (
    answers.appearance === 'good'
  ) {
    score += 1;
  }

  return score;
};


const getAssessment = (
  score
) => {
  if (score >= 7) {
    return {
      condition: 'Good Condition',
      range: '80–100%',
      className: 'good'
    };
  }

  if (score >= 4) {
    return {
      condition: 'Fair Condition',
      range: '50–79%',
      className: 'fair'
    };
  }

  return {
    condition: 'Needs Attention',
    range: '20–49%',
    className: 'needs'
  };
};


// ============================================================
// COMPONENT
// ============================================================

export default function SellerReuseTools() {

  const fileInputRef =
    useRef(null);

  const [activeTab, setActiveTab] =
    useState('condition');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [data, setData] =
    useState({
      recentChecks: [],
      categories: [],
      listings: [],
      impact: {}
    });

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState('');

  const [step, setStep] =
    useState(1);

  const [answers, setAnswers] =
    useState({
      damage: '',
      function: '',
      appearance: ''
    });

  const [assessment, setAssessment] =
    useState(null);

  const [savingCheck, setSavingCheck] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState('');

  const [selectedListingId, setSelectedListingId] =
    useState('');

  const [quantity, setQuantity] =
    useState(1);

  const [impactResult, setImpactResult] =
    useState(null);

  const [impactLoading, setImpactLoading] =
    useState(false);

  const [impactError, setImpactError] =
    useState('');


  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = async (
    silent = false
  ) => {
    try {
      setError('');

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await getReuseToolsData();

      setData({
        recentChecks:
          response?.recentChecks || [],

        categories:
          response?.categories || [],

        listings:
          response?.listings || [],

        impact:
          response?.impact || {}
      });

      if (
        !selectedCategory &&
        response?.categories?.length
      ) {
        setSelectedCategory(
          response.categories[0].value ||
          response.categories[0].name ||
          ''
        );
      }

    } catch (err) {

      setError(
        err?.message ||
        'Unable to load Reuse Tools data.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  // ==========================================================
  // CLEAN IMAGE PREVIEW
  // ==========================================================

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);


  // ==========================================================
  // IMPACT STATS
  // ==========================================================

  const stats = useMemo(
    () => ({
      waste: Number(
        data?.impact?.wasteDiverted || 0
      ),

      co2: Number(
        data?.impact?.co2Saved || 0
      ),

      trees: Number(
        data?.impact?.treesEquivalent || 0
      ),

      reused: Number(
        data?.impact?.itemsReused || 0
      )
    }),
    [data]
  );


  // ==========================================================
  // FILE UPLOAD
  // ==========================================================

  const handleFile = (
    file
  ) => {

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png'
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        'Please upload a JPG, JPEG, or PNG image.'
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        'The image must be 5MB or smaller.'
      );

      return;
    }

    setError('');

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setStep(2);
    setAssessment(null);
  };


  // ==========================================================
  // CONDITION ASSESSMENT
  // ==========================================================

  const runAssessment = async () => {

    const score =
      getConditionScore(
        answers
      );

    const result =
      getAssessment(score);

    setAssessment(result);
    setStep(3);
    setSavingCheck(true);

    try {

      await submitConditionCheck({
        fileName:
          selectedFile?.name ||
          null,

        condition:
          result.condition,

        score,

        category:
          selectedCategory ||
          'Uncategorized'
      });

      await loadData(true);

    } catch (err) {

      setError(
        err?.message ||
        'Assessment completed, but the result could not be saved.'
      );

    } finally {

      setSavingCheck(false);
    }
  };


  // ==========================================================
  // RESET CHECKER
  // ==========================================================

  const resetChecker = () => {

    setSelectedFile(null);

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreviewUrl('');

    setStep(1);

    setAnswers({
      damage: '',
      function: '',
      appearance: ''
    });

    setAssessment(null);
  };


  // ==========================================================
  // ENVIRONMENTAL IMPACT
  // ==========================================================

  const calculateImpact = async () => {

    if (
      !selectedCategory &&
      !selectedListingId
    ) {
      setImpactError(
        'Select an item or category first.'
      );

      return;
    }

    try {

      setImpactError('');
      setImpactLoading(true);

      const result =
        await calculateReuseImpact({
          listingId:
            selectedListingId ||
            null,

          category:
            selectedCategory,

          quantity:
            Math.max(
              1,
              Number(quantity) || 1
            )
        });

      setImpactResult(
        result?.impact ||
        result
      );

    } catch (err) {

      setImpactError(
        err?.message ||
        'Unable to calculate impact.'
      );

    } finally {

      setImpactLoading(false);
    }
  };


  const currentImpact =
    impactResult || stats;


  const hasAnswers =
    Object.values(
      answers
    ).every(Boolean);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="seller-reuse-tools">

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="reuse-tabs">

        <button
          type="button"
          className={
            activeTab === 'condition'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('condition')
          }
        >

          <Search size={19} />

          <span>
            Condition Checker
          </span>

        </button>


        <button
          type="button"
          className={
            activeTab === 'impact'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('impact')
          }
        >

          <Leaf size={19} />

          <span>
            Environmental Impact
          </span>

        </button>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="reuse-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
            aria-label="Close error"
          >
            <X size={17} />
          </button>

        </div>
      )}


      {/* =====================================================
          CONDITION CHECKER TAB
      ===================================================== */}

      {activeTab === 'condition' ? (
        <>

          {/* =================================================
              TOP GRID
          ================================================= */}

          <section className="reuse-top-grid">

            {/* ===============================================
                GUIDE
            =============================================== */}

            <article
              className="
                info-card
                checker-guide
              "
            >

              <div
                className="
                  card-icon
                  purple
                "
              >
                <Search size={25} />
              </div>

              <h2>
                Condition Checker
              </h2>

              <p className="card-subtitle">
                Check the condition of your item and get a suggested category and value range.
              </p>


              <div className="steps">

                <div className="step-row">

                  <span>
                    1
                  </span>

                  <div>

                    <strong>
                      Upload a photo of your item
                    </strong>

                    <small>
                      Clear and well-lit photos work best.
                    </small>

                  </div>

                </div>


                <div className="step-row">

                  <span>
                    2
                  </span>

                  <div>

                    <strong>
                      Answer a few quick questions
                    </strong>

                    <small>
                      Tell us about the item’s condition and usage.
                    </small>

                  </div>

                </div>


                <div className="step-row">

                  <span>
                    3
                  </span>

                  <div>

                    <strong>
                      Get your result
                    </strong>

                    <small>
                      See the condition level, suggested category, and estimated value range.
                    </small>

                  </div>

                </div>

              </div>


              <Sprout
                className="guide-sprout"
                size={58}
              />

            </article>


            {/* ===============================================
                CHECK PANEL
            =============================================== */}

            <article
              className="
                panel-card
                check-panel
              "
            >

              <div className="panel-heading">

                <div>

                  <h2>
                    Check Your Item
                  </h2>

                  <p>
                    Upload a photo and get an instant assessment.
                  </p>

                </div>


                {step > 1 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={
                      resetChecker
                    }
                  >
                    Start over
                  </button>
                )}

              </div>


              {/* =============================================
                  STEP 1
              ============================================= */}

              {step === 1 && (

                <button
                  type="button"
                  className="upload-box"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={(event) => {
                    event.preventDefault();

                    handleFile(
                      event
                        .dataTransfer
                        .files?.[0]
                    );
                  }}
                >

                  <CloudUpload
                    size={48}
                  />

                  <strong>
                    Click to upload or drag and drop
                  </strong>

                  <span>
                    JPG, PNG (Max 5MB)
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    hidden
                    onChange={(event) =>
                      handleFile(
                        event.target.files?.[0]
                      )
                    }
                  />

                </button>
              )}


              {/* =============================================
                  STEP 2
              ============================================= */}

              {step === 2 && (

                <div className="question-area">

                  <div className="image-preview-row">

                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Uploaded item"
                      />
                    ) : (
                      <div className="preview-empty">
                        <CloudUpload size={30} />
                      </div>
                    )}

                    <div>

                      <strong>
                        {selectedFile?.name ||
                          'Uploaded item'}
                      </strong>

                      <small>
                        Photo uploaded successfully.
                      </small>

                    </div>

                  </div>


                  {/* DAMAGE */}

                  <label>
                    How much visible damage does the item have?
                  </label>

                  <div className="choice-row">

                    {[
                      ['none', 'None'],
                      ['minor', 'Minor'],
                      ['major', 'Major']
                    ].map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            answers.damage === value
                              ? 'selected'
                              : ''
                          }
                          onClick={() =>
                            setAnswers({
                              ...answers,
                              damage: value
                            })
                          }
                        >
                          {label}
                        </button>
                      )
                    )}

                  </div>


                  {/* FUNCTION */}

                  <label>
                    Does the item work as expected?
                  </label>

                  <div className="choice-row">

                    {[
                      ['fully', 'Fully'],
                      ['partly', 'Partly'],
                      ['not', 'Not working']
                    ].map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            answers.function === value
                              ? 'selected'
                              : ''
                          }
                          onClick={() =>
                            setAnswers({
                              ...answers,
                              function: value
                            })
                          }
                        >
                          {label}
                        </button>
                      )
                    )}

                  </div>


                  {/* APPEARANCE */}

                  <label>
                    What is the overall appearance?
                  </label>

                  <div className="choice-row">

                    {[
                      [
                        'excellent',
                        'Excellent'
                      ],
                      [
                        'good',
                        'Good'
                      ],
                      [
                        'used',
                        'Used'
                      ]
                    ].map(
                      ([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={
                            answers.appearance === value
                              ? 'selected'
                              : ''
                          }
                          onClick={() =>
                            setAnswers({
                              ...answers,
                              appearance: value
                            })
                          }
                        >
                          {label}
                        </button>
                      )
                    )}

                  </div>


                  <button
                    type="button"
                    className="
                      primary-button
                      purple-button
                    "
                    disabled={
                      !hasAnswers ||
                      savingCheck
                    }
                    onClick={
                      runAssessment
                    }
                  >
                    {savingCheck
                      ? 'Saving result…'
                      : 'Get My Result'}

                    <Check size={18} />
                  </button>

                </div>
              )}


              {/* =============================================
                  STEP 3
              ============================================= */}

              {step === 3 &&
                assessment && (

                  <div className="assessment-result">

                    <div
                      className={`
                        result-badge
                        ${assessment.className}
                      `}
                    >
                      <CircleCheck
                        size={35}
                      />
                    </div>


                    <div>

                      <span>
                        Your item assessment
                      </span>

                      <h3>
                        {assessment.condition}
                      </h3>

                      <p>
                        Estimated resale value range:
                        {' '}
                        <strong>
                          {assessment.range}
                        </strong>
                        {' '}
                        of comparable item value.
                      </p>

                    </div>


                    <button
                      type="button"
                      className="secondary-button"
                      onClick={
                        resetChecker
                      }
                    >
                      Check another item
                    </button>

                  </div>
                )}

            </article>

          </section>


          {/* =================================================
              BOTTOM GRID
          ================================================= */}

          <section className="reuse-bottom-grid">

            {/* ===============================================
                ENVIRONMENT GUIDE
            =============================================== */}

            <article
              className="
                info-card
                impact-guide
              "
            >

              <div
                className="
                  card-icon
                  green
                "
              >
                <Leaf size={25} />
              </div>

              <h2>
                Environmental Impact
              </h2>

              <p className="card-subtitle">
                See how you're helping the planet by giving your items a second life.
              </p>


              <div className="impact-points">

                <div>

                  <Leaf size={23} />

                  <span>

                    <strong>
                      Reduce waste
                    </strong>

                    <small>
                      Keep items out of landfills.
                    </small>

                  </span>

                </div>


                <div>

                  <Recycle size={23} />

                  <span>

                    <strong>
                      Lower carbon footprint
                    </strong>

                    <small>
                      Less production, less emissions.
                    </small>

                  </span>

                </div>


                <div>

                  <TreePine size={23} />

                  <span>

                    <strong>
                      Support a circular economy
                    </strong>

                    <small>
                      Reuse today, a greener tomorrow.
                    </small>

                  </span>

                </div>

              </div>


              <div className="impact-art">
                🌎
              </div>

            </article>


            {/* ===============================================
                RECENT CHECKS
            =============================================== */}

            <article
              className="
                panel-card
                recent-panel
              "
            >

              <div className="panel-heading">

                <div>

                  <h2>
                    Recent Checks
                  </h2>

                  <p>
                    Your latest saved condition assessments.
                  </p>

                </div>


                <button
                  type="button"
                  className="icon-refresh"
                  onClick={() =>
                    loadData(true)
                  }
                  disabled={refreshing}
                  aria-label="Refresh recent checks"
                >
                  <RefreshCw
                    size={18}
                    className={
                      refreshing
                        ? 'spin'
                        : ''
                    }
                  />
                </button>

              </div>


              {loading ? (

                <div className="empty-state">
                  Loading recent checks…
                </div>

              ) : data.recentChecks.length === 0 ? (

                <div className="empty-state">
                  No saved checks yet.
                  Upload your first item above.
                </div>

              ) : (

                <div className="recent-list">

                  {data.recentChecks
                    .slice(0, 5)
                    .map((item) => (

                      <div
                        className="recent-item"
                        key={item.check_id}
                      >

                        <div className="recent-thumb">

                          {item.image_url ? (

                            <img
                              src={
                                item.image_url
                              }
                              alt=""
                            />

                          ) : (

                            <PackageIconFallback />

                          )}

                        </div>


                        <div className="recent-name">

                          <strong>
                            {item.title ||
                              item.file_name ||
                              'Item check'}
                          </strong>

                          <small>
                            {item.category ||
                              'Item'}
                          </small>

                        </div>


                        <span
                          className={`
                            condition-pill
                            ${conditionClass(
                              item.condition
                            )}
                          `}
                        >
                          {item.condition}
                        </span>


                        <time>
                          {formatDate(
                            item.created_at
                          )}
                        </time>

                      </div>

                    ))}

                </div>

              )}

            </article>

          </section>

        </>

      ) : (

        /* ====================================================
           ENVIRONMENTAL IMPACT TAB
        ==================================================== */

        <section className="environment-layout">

          {/* ==================================================
              CALCULATOR
          ================================================== */}

          <article
            className="
              panel-card
              calculator-card
            "
          >

            <div className="panel-heading">

              <div>

                <h2>
                  Calculate Your Impact
                </h2>

                <p>
                  Select an item or category to see the estimated environmental impact.
                </p>

              </div>

            </div>


            <div className="calculator-form">

              <label>
                Item from My Listings
              </label>

              <select
                value={selectedListingId}
                onChange={(event) =>
                  setSelectedListingId(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select an item (optional)
                </option>

                {data.listings.map(
                  (listing) => (
                    <option
                      key={
                        listing.listing_id
                      }
                      value={
                        listing.listing_id
                      }
                    >
                      {listing.title}
                    </option>
                  )
                )}

              </select>


              <label>
                Item category
              </label>

              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select an item category
                </option>

                {data.categories.map(
                  (category) => (

                    <option
                      key={
                        category.value ||
                        category.name
                      }
                      value={
                        category.value ||
                        category.name
                      }
                    >
                      {category.name}
                    </option>

                  )
                )}

              </select>


              <label>
                Quantity
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value
                  )
                }
              />


              {impactError && (
                <div className="field-error">
                  {impactError}
                </div>
              )}


              <button
                type="button"
                className="
                  primary-button
                  green-button
                "
                onClick={
                  calculateImpact
                }
                disabled={
                  impactLoading
                }
              >

                {impactLoading
                  ? 'Calculating…'
                  : 'Calculate Impact'}

                <Leaf size={18} />

              </button>

            </div>

          </article>


          {/* ==================================================
              IMPACT SUMMARY
          ================================================== */}

          <article
            className="
              panel-card
              impact-summary
            "
          >

            <div className="panel-heading">

              <div>

                <h2>
                  Your Environmental Impact
                </h2>

                <p>
                  Total from your saved activity.
                </p>

              </div>

            </div>


            <div className="impact-stat-grid">

              {/* WASTE */}

              <div>

                <span
                  className="
                    stat-icon
                    green
                  "
                >
                  <Leaf size={22} />
                </span>

                <strong>
                  {Number(
                    currentImpact.wasteDiverted ||
                    0
                  ).toFixed(1)}
                  {' '}
                  kg
                </strong>

                <small>
                  Waste diverted
                </small>

              </div>


              {/* CO2 */}

              <div>

                <span
                  className="
                    stat-icon
                    blue
                  "
                >
                  CO₂
                </span>

                <strong>
                  {Number(
                    currentImpact.co2Saved ||
                    0
                  ).toFixed(1)}
                  {' '}
                  kg
                </strong>

                <small>
                  CO₂ saved
                </small>

              </div>


              {/* TREES */}

              <div>

                <span
                  className="
                    stat-icon
                    green
                  "
                >
                  <TreePine
                    size={22}
                  />
                </span>

                <strong>
                  {Number(
                    currentImpact.treesEquivalent ||
                    0
                  ).toFixed(1)}
                </strong>

                <small>
                  Trees equivalent
                </small>

              </div>


              {/* REUSED */}

              <div>

                <span
                  className="
                    stat-icon
                    green
                  "
                >
                  <Recycle
                    size={22}
                  />
                </span>

                <strong>
                  {Number(
                    currentImpact.itemsReused ||
                    0
                  )}
                </strong>

                <small>
                  Items reused
                </small>

              </div>

            </div>


            <div className="difference-note">

              <Leaf size={19} />

              <span>

                <strong>
                  You're making a difference!
                </strong>

                <small>
                  Every item you resell helps create a cleaner and greener future.
                </small>

              </span>

            </div>

          </article>

        </section>

      )}

    </main>
  );
}


// ============================================================
// FALLBACK ICON
// ============================================================

function PackageIconFallback() {
  return (
    <div className="fallback-item">
      <Recycle size={25} />
    </div>
  );
}