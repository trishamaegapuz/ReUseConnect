import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  ShieldCheck,
  Leaf,
  UploadCloud,
  Link2,
  Search,
  TreePine,
  Users,
  Cloud,
  ArrowUpRight,
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

import {
  getReuseToolsImpact,
  checkItemCondition
} from '../../services/buyer/buyerReuseToolsApi';

import '../../styles/buyer/BuyerReuseTools.css';


/* ============================================================
   HELPERS
============================================================ */

const formatNumber = (value, decimals = 0) => {
  const number = Number(value || 0);

  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};


const getConditionClass = (condition = '') => {
  const value = String(condition).toLowerCase();

  if (
    value.includes('new') ||
    value.includes('excellent') ||
    value.includes('like')
  ) {
    return 'condition-good';
  }

  if (value.includes('fair')) {
    return 'condition-fair';
  }

  if (
    value.includes('poor') ||
    value.includes('damaged')
  ) {
    return 'condition-poor';
  }

  return 'condition-neutral';
};


const getConditionLabel = (condition = '') => {
  if (!condition) return 'Not specified';

  const value = String(condition).toLowerCase();

  if (value === 'new') return 'New';
  if (value.includes('like')) return 'Like New';
  if (value === 'good') return 'Good';
  if (value === 'fair') return 'Fair';
  if (value === 'poor') return 'Poor';

  return condition;
};


/* ============================================================
   COMPONENT
============================================================ */

const BuyerReuseTools = () => {

  /* ----------------------------------------------------------
     CONDITION CHECKER
  ---------------------------------------------------------- */

  const [description, setDescription] = useState('');

  const [selectedImage, setSelectedImage] = useState(null);

  const [checkingCondition, setCheckingCondition] = useState(false);

  const [conditionResult, setConditionResult] = useState(null);

  const [conditionError, setConditionError] = useState('');

  const fileInputRef = useRef(null);


  /* ----------------------------------------------------------
     ENVIRONMENTAL IMPACT
  ---------------------------------------------------------- */

  const [impact, setImpact] = useState(null);

  const [impactLoading, setImpactLoading] = useState(true);

  const [impactError, setImpactError] = useState('');


  /* ----------------------------------------------------------
     MODAL
  ---------------------------------------------------------- */

  const [showImpactModal, setShowImpactModal] = useState(false);


  /* ==========================================================
     LOAD ENVIRONMENTAL DATA
  ========================================================== */

  const loadImpact = async () => {

    try {

      setImpactLoading(true);
      setImpactError('');

      const result = await getReuseToolsImpact();

      setImpact(result || null);

    } catch (error) {

      console.error(
        'BUYER REUSE TOOLS IMPACT ERROR:',
        error
      );

      setImpactError(
        error?.message ||
        'Unable to load your environmental impact.'
      );

    } finally {

      setImpactLoading(false);

    }

  };


  useEffect(() => {

    loadImpact();

  }, []);


  /* ==========================================================
     FILE SELECT
  ========================================================== */

  const handleFileSelect = (event) => {

    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {

      setConditionError(
        'Please select a JPG, PNG, or WEBP image.'
      );

      setSelectedImage(null);

      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      setConditionError(
        'The image must be 5MB or smaller.'
      );

      setSelectedImage(null);

      return;
    }


    setConditionError('');

    setSelectedImage(file);

  };


  /* ==========================================================
     CHECK CONDITION
  ========================================================== */

  const handleCheckCondition = async () => {

    const trimmedDescription =
      description.trim();


    if (!trimmedDescription) {

      setConditionError(
        'Please enter an item description so the system can check it against items in the marketplace.'
      );

      return;
    }


    try {

      setCheckingCondition(true);

      setConditionError('');

      setConditionResult(null);


      const result =
        await checkItemCondition(
          trimmedDescription
        );


      setConditionResult(result);

    } catch (error) {

      console.error(
        'BUYER CONDITION CHECK ERROR:',
        error
      );

      setConditionError(
        error?.message ||
        'Unable to check the item condition.'
      );

    } finally {

      setCheckingCondition(false);

    }

  };


  /* ==========================================================
     IMPACT VALUES
  ========================================================== */

  const totalImpact =
    Number(
      impact?.total_co2_saved ||
      impact?.co2_saved ||
      0
    );


  const itemsReused =
    Number(
      impact?.items_reused ||
      0
    );


  const treesEquivalent =
    Number(
      impact?.trees_equivalent ||
      0
    );


  const communityActivity =
    Number(
      impact?.community_activity ||
      0
    );


  const purchases =
    Number(
      impact?.breakdown?.purchases ||
      0
    );


  const donations =
    Number(
      impact?.breakdown?.donations ||
      0
    );


  const trades =
    Number(
      impact?.breakdown?.trades ||
      0
    );


  const other =
    Number(
      impact?.breakdown?.other ||
      0
    );


  const breakdownTotal =
    purchases +
    donations +
    trades +
    other;


  const purchasePercentage =
    breakdownTotal > 0
      ? Math.round(
          (purchases / breakdownTotal) * 100
        )
      : 0;


  const donationPercentage =
    breakdownTotal > 0
      ? Math.round(
          (donations / breakdownTotal) * 100
        )
      : 0;


  const tradePercentage =
    breakdownTotal > 0
      ? Math.round(
          (trades / breakdownTotal) * 100
        )
      : 0;


  const otherPercentage =
    breakdownTotal > 0
      ? Math.max(
          0,
          100 -
          purchasePercentage -
          donationPercentage -
          tradePercentage
        )
      : 0;


  const impactMessage = useMemo(() => {

    if (itemsReused <= 0) {

      return {
        title: 'Start making an impact!',
        text:
          'Your reuse activity will appear here as you complete eligible transactions.'
      };

    }


    return {
      title: 'Every item reused matters!',
      text:
        'Your reuse activity helps reduce waste, conserve resources, and build a greener tomorrow.'
    };

  }, [itemsReused]);


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="buyer-reuse-tools">

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="reuse-tools-main">

        {/* ====================================================
            CONDITION CHECKER
        ==================================================== */}

        <section className="reuse-tool-card condition-card">

          <div className="reuse-card-header">

            <div className="reuse-card-header-icon condition-icon">

              <ShieldCheck size={29} />

            </div>

            <div>

              <h2>
                Condition Checker
              </h2>

              <p>
                Check the condition of your item before you
                buy, sell, or donate.
              </p>

            </div>

          </div>


          <div className="condition-card-content">

            {/* UPLOAD */}

            <button
              type="button"
              className="condition-upload-box"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                hidden
              />


              {selectedImage ? (

                <>

                  <div className="condition-selected-image">

                    <ImageIcon size={27} />

                  </div>

                  <strong>
                    {selectedImage.name}
                  </strong>

                  <span>
                    Image selected
                  </span>

                  <small>
                    You can still describe the item below.
                  </small>

                </>

              ) : (

                <>

                  <UploadCloud
                    size={48}
                    strokeWidth={1.8}
                  />

                  <strong>
                    Upload an item photo
                  </strong>

                  <span>
                    Drag and drop an image or click to browse
                  </span>

                  <small>
                    Supports JPG, PNG, WEBP (max 5MB)
                  </small>

                </>

              )}

            </button>


            {/* OR */}

            <div className="condition-or">

              <span></span>

              <strong>OR</strong>

              <span></span>

            </div>


            {/* DESCRIPTION */}

            <div className="condition-description">

              <Link2 size={19} />

              <input
                type="text"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Enter item description (optional)"
                onKeyDown={(event) => {

                  if (event.key === 'Enter') {
                    handleCheckCondition();
                  }

                }}
              />

            </div>


            <small className="condition-description-help">
              e.g. "white sneakers, visible wear on the sole"
            </small>


            {/* ERROR */}

            {conditionError && (

              <div className="reuse-inline-error">

                <AlertCircle size={16} />

                <span>
                  {conditionError}
                </span>

              </div>

            )}


            {/* BUTTON */}

            <button
              type="button"
              className="condition-check-button"
              onClick={handleCheckCondition}
              disabled={checkingCondition}
            >

              {checkingCondition ? (

                <>
                  <RefreshCw
                    size={18}
                    className="reuse-spin"
                  />

                  Checking...
                </>

              ) : (

                <>
                  <Search size={18} />

                  Check Condition
                </>

              )}

            </button>


            {/* HOW IT WORKS */}

            <div className="how-it-works">

              <h3>
                How it works?
              </h3>


              <div className="how-it-works-grid">

                <div className="how-step">

                  <span>1</span>

                  <p>
                    Upload or describe
                    <br />
                    your item
                  </p>

                </div>


                <div className="how-step">

                  <span>2</span>

                  <p>
                    We search the
                    <br />
                    marketplace data
                  </p>

                </div>


                <div className="how-step">

                  <span>3</span>

                  <p>
                    Get the available
                    <br />
                    condition result
                  </p>

                </div>

              </div>

            </div>


            {/* BOTTOM MESSAGE */}

            <div className="condition-bottom-message">

              <div className="condition-bottom-icon">

                <Leaf size={23} />

              </div>

              <div>

                <strong>
                  Better decisions.
                </strong>

                <span>
                  Longer life for your items.
                </span>

              </div>

            </div>

          </div>

        </section>


        {/* ====================================================
            ENVIRONMENTAL IMPACT
        ==================================================== */}

        <section className="reuse-tool-card impact-card">

          <div className="reuse-card-header">

            <div className="reuse-card-header-icon impact-icon">

              <Leaf size={29} />

            </div>

            <div>

              <h2>
                Environmental Impact
              </h2>

              <p>
                See how your reuse activities are helping
                the planet.
              </p>

            </div>

          </div>


          {impactLoading ? (

            <div className="reuse-impact-loading">

              <div className="reuse-loading-spinner"></div>

              <span>
                Loading your impact...
              </span>

            </div>

          ) : impactError ? (

            <div className="reuse-impact-error">

              <AlertCircle size={22} />

              <p>
                {impactError}
              </p>

              <button
                type="button"
                onClick={loadImpact}
              >
                Try Again
              </button>

            </div>

          ) : (

            <div className="impact-card-content">

              {/* TOTAL IMPACT */}

              <div className="total-impact-box">

                <div className="impact-earth">

                  <Leaf size={76} />

                </div>


                <div className="total-impact-value">

                  <span>
                    Your Total Impact
                  </span>

                  <strong>
                    {formatNumber(totalImpact, 1)} kg
                  </strong>

                  <small>
                    CO₂ saved (est.)
                  </small>

                </div>


                <div className="impact-growth">

                  <ArrowUpRight size={15} />

                  <strong>
                    {impact?.monthly_change
                      ? `${formatNumber(impact.monthly_change)}%`
                      : '0%'}
                  </strong>

                  <span>
                    vs. last month
                  </span>

                </div>

              </div>


              {/* STAT BOXES */}

              <div className="impact-stat-grid">

                <div className="impact-stat">

                  <div className="impact-stat-icon green">

                    <Leaf size={20} />

                  </div>

                  <strong>
                    {formatNumber(itemsReused)}
                  </strong>

                  <span>
                    Items Reused
                  </span>

                </div>


                <div className="impact-stat">

                  <div className="impact-stat-icon tree">

                    <TreePine size={20} />

                  </div>

                  <strong>
                    {formatNumber(treesEquivalent)}
                  </strong>

                  <span>
                    Trees Equivalent
                  </span>

                </div>


                <div className="impact-stat">

                  <div className="impact-stat-icon people">

                    <Users size={20} />

                  </div>

                  <strong>
                    {formatNumber(communityActivity)}
                  </strong>

                  <span>
                    Community Activity
                  </span>

                </div>


                <div className="impact-stat">

                  <div className="impact-stat-icon co2">

                    <Cloud size={20} />

                  </div>

                  <strong>
                    {formatNumber(totalImpact, 1)} kg
                  </strong>

                  <span>
                    CO₂ Saved (est.)
                  </span>

                </div>

              </div>


              {/* BREAKDOWN */}

              <div className="impact-breakdown">

                <div className="impact-breakdown-heading">

                  <h3>
                    Your Impact Breakdown
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      setShowImpactModal(true)
                    }
                  >
                    View Details
                    <ChevronRight size={15} />
                  </button>

                </div>


                <div className="impact-progress">

                  <span
                    style={{
                      width: `${purchasePercentage}%`
                    }}
                  />

                  <span
                    style={{
                      width: `${donationPercentage}%`
                    }}
                  />

                  <span
                    style={{
                      width: `${tradePercentage}%`
                    }}
                  />

                  <span
                    style={{
                      width: `${otherPercentage}%`
                    }}
                  />

                </div>


                <div className="impact-legend">

                  <div>

                    <i className="legend-dot purchase"></i>

                    <span>
                      Purchases
                    </span>

                    <strong>
                      {purchasePercentage}%
                    </strong>

                  </div>


                  <div>

                    <i className="legend-dot donation"></i>

                    <span>
                      Donations
                    </span>

                    <strong>
                      {donationPercentage}%
                    </strong>

                  </div>


                  <div>

                    <i className="legend-dot trade"></i>

                    <span>
                      Trades
                    </span>

                    <strong>
                      {tradePercentage}%
                    </strong>

                  </div>


                  <div>

                    <i className="legend-dot other"></i>

                    <span>
                      Other
                    </span>

                    <strong>
                      {otherPercentage}%
                    </strong>

                  </div>

                </div>

              </div>


              {/* MESSAGE */}

              <div className="impact-message">

                <div className="impact-message-icon">

                  <Leaf size={27} />

                </div>

                <div>

                  <strong>
                    {impactMessage.title}
                  </strong>

                  <span>
                    {impactMessage.text}
                  </span>

                </div>

              </div>

            </div>

          )}

        </section>

      </main>


      {/* ======================================================
          CONDITION RESULT MODAL
      ====================================================== */}

      {conditionResult && (

        <div
          className="reuse-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setConditionResult(null);
            }

          }}
        >

          <div className="reuse-modal">

            <div className="reuse-modal-header">

              <div>

                <span>
                  CONDITION CHECK
                </span>

                <h2>
                  Item Condition Result
                </h2>

              </div>

              <button
                type="button"
                className="reuse-modal-close"
                onClick={() =>
                  setConditionResult(null)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="condition-result-content">

              {conditionResult.found ? (

                <>

                  <div className="condition-result-summary">

                    <div className="condition-result-icon">

                      <CheckCircle2 size={30} />

                    </div>

                    <div>

                      <span>
                        Based on marketplace data
                      </span>

                      <strong>
                        {getConditionLabel(
                          conditionResult.condition
                        )}
                      </strong>

                    </div>

                  </div>


                  <p className="condition-result-description">

                    {conditionResult.message ||
                      'Matching marketplace items were found using your description.'}

                  </p>


                  {conditionResult.matches?.length > 0 && (

                    <div className="condition-matches">

                      <h3>
                        Matching items
                      </h3>


                      {conditionResult.matches.map(
                        (item) => (

                          <div
                            className="condition-match-row"
                            key={item.listing_id}
                          >

                            <div>

                              <strong>
                                {item.title}
                              </strong>

                              <span>
                                {item.category_name ||
                                  'Marketplace item'}
                              </span>

                            </div>


                            <span
                              className={`condition-badge ${getConditionClass(
                                item.condition
                              )}`}
                            >
                              {getConditionLabel(
                                item.condition
                              )}
                            </span>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </>

              ) : (

                <div className="condition-not-found">

                  <FileSearch size={42} />

                  <h3>
                    No matching marketplace item found
                  </h3>

                  <p>
                    We could not find an existing marketplace
                    item that closely matches your description.
                    Try adding more details such as the item
                    name, brand, or visible condition.
                  </p>

                </div>

              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          IMPACT DETAILS MODAL
      ====================================================== */}

      {showImpactModal && (

        <div
          className="reuse-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowImpactModal(false);
            }

          }}
        >

          <div className="reuse-modal impact-details-modal">

            <div className="reuse-modal-header">

              <div>

                <span>
                  ENVIRONMENTAL IMPACT
                </span>

                <h2>
                  Your Impact Details
                </h2>

              </div>

              <button
                type="button"
                className="reuse-modal-close"
                onClick={() =>
                  setShowImpactModal(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="impact-modal-content">

              <div className="impact-modal-total">

                <Leaf size={30} />

                <div>

                  <span>
                    Estimated CO₂ saved
                  </span>

                  <strong>
                    {formatNumber(
                      totalImpact,
                      1
                    )} kg
                  </strong>

                </div>

              </div>


              <div className="impact-detail-list">

                <div>

                  <span>
                    Items reused
                  </span>

                  <strong>
                    {formatNumber(itemsReused)}
                  </strong>

                </div>


                <div>

                  <span>
                    Tree equivalent
                  </span>

                  <strong>
                    {formatNumber(treesEquivalent)}
                  </strong>

                </div>


                <div>

                  <span>
                    Community activity
                  </span>

                  <strong>
                    {formatNumber(communityActivity)}
                  </strong>

                </div>


                <div>

                  <span>
                    Purchases
                  </span>

                  <strong>
                    {formatNumber(purchases)}
                  </strong>

                </div>

              </div>


              <div className="impact-method-note">

                <Sparkles size={17} />

                <span>
                  Environmental values are estimated from
                  your existing ReUseConnect transaction data.
                </span>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};


export default BuyerReuseTools;