import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Truck,
  User,
  Wallet,
  XCircle
} from 'lucide-react';

import {
  useNavigate,
  useSearchParams
} from 'react-router-dom';

import {
  createBuyerOrder,
  getBuyerCheckoutListing
} from '../../services/buyer/buyerOrdersService';

import '../../styles/buyer/BuyerCheckout.css';


/*
============================================================
HELPERS
============================================================
*/

const getCurrentUser = () => {

  const keys = [
    'reuseconnect_user',
    'user',
    'currentUser',
    'authUser'
  ];

  for (const key of keys) {

    try {

      const stored =
        localStorage.getItem(key);

      if (!stored) {
        continue;
      }

      const parsed =
        JSON.parse(stored);

      if (parsed) {
        return parsed;
      }

    } catch (error) {

      console.warn(
        `Unable to read ${key}:`,
        error
      );

    }

  }

  return null;

};


/*
------------------------------------------------------------
GET USER ID
------------------------------------------------------------
*/

const getUserId = (user) => {

  return (
    user?.user_id ||
    user?.id ||
    user?.userId ||
    null
  );

};


/*
------------------------------------------------------------
GET DEFAULT ADDRESS
------------------------------------------------------------
*/

const getDefaultAddress = (user) => {

  if (!user) {
    return '';
  }


  /*
  If an existing complete address is available,
  use it first.
  */

  if (
    typeof user.address === 'string' &&
    user.address.trim()
  ) {

    const parts = [
      user.address,
      user.city,
      user.province,
      user.postal_code
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ''
      )
      .map(
        (value) =>
          String(value).trim()
      );

    return parts.join(', ');

  }


  const parts = [
    user.address,
    user.city,
    user.province,
    user.postal_code
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
    )
    .map(
      (value) =>
        String(value).trim()
    );


  return parts.join(', ');

};


/*
------------------------------------------------------------
FORMAT MONEY
------------------------------------------------------------
*/

const formatMoney = (value) => {

  const amount =
    Number(value) || 0;

  return amount.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );

};


/*
------------------------------------------------------------
NORMALIZE IMAGE
------------------------------------------------------------
*/

const normalizeImage = (imageUrl) => {

  if (!imageUrl) {
    return '';
  }

  const value =
    String(imageUrl).trim();

  if (!value) {
    return '';
  }

  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {

    return value;

  }

  if (
    value.startsWith('/api/')
  ) {

    return `http://localhost:5000${value}`;

  }

  if (
    value.startsWith('/uploads/')
  ) {

    const filename =
      value
        .split('/')
        .filter(Boolean)
        .pop();

    return (
      `http://localhost:5000` +
      `/api/seller/listings/image/` +
      encodeURIComponent(filename)
    );

  }

  return value;

};


/*
============================================================
CHECKOUT PAGE
============================================================
*/

const BuyerCheckout = () => {

  const navigate =
    useNavigate();

  const [
    searchParams
  ] = useSearchParams();


  const listingId =
    searchParams.get(
      'listingId'
    );


  /*
  ----------------------------------------------------------
  STATE
  ----------------------------------------------------------
  */

  const [
    listing,
    setListing
  ] = useState(null);


  const [
    quantity,
    setQuantity
  ] = useState(1);


  const [
    shippingAddress,
    setShippingAddress
  ] = useState('');


  const [
    paymentMethod,
    setPaymentMethod
  ] = useState(
    'CASH_ON_DELIVERY'
  );


  const [
    referenceNumber,
    setReferenceNumber
  ] = useState('');


  const [
    notes,
    setNotes
  ] = useState('');


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    placingOrder,
    setPlacingOrder
  ] = useState(false);


  const [
    error,
    setError
  ] = useState('');


  const [
    successOrder,
    setSuccessOrder
  ] = useState(null);


  /*
  ----------------------------------------------------------
  LOAD CHECKOUT ITEM
  ----------------------------------------------------------
  */

  useEffect(() => {

    let mounted = true;


    const loadCheckout = async () => {

      if (!listingId) {

        if (mounted) {

          setError(
            'No listing was selected for checkout.'
          );

          setLoading(false);

        }

        return;

      }


      try {

        setLoading(true);

        setError('');


        const response =
          await getBuyerCheckoutListing(
            listingId
          );


        if (!mounted) {
          return;
        }


        const checkoutListing =
          response?.listing ||
          response?.data?.listing ||
          response?.data ||
          null;


        if (!checkoutListing) {

          setError(
            'Unable to find the selected item.'
          );

          return;

        }


        setListing(
          checkoutListing
        );


        /*
        Make sure initial quantity is valid.
        */

        const available =
          Number(
            checkoutListing.quantity
          ) || 1;


        setQuantity(
          Math.min(
            1,
            available
          )
        );


        /*
        Load buyer's saved address.
        */

        const currentUser =
          getCurrentUser();


        const defaultAddress =
          getDefaultAddress(
            currentUser
          );


        if (defaultAddress) {

          setShippingAddress(
            defaultAddress
          );

        }

      } catch (requestError) {

        console.error(
          'Checkout loading error:',
          requestError
        );


        if (mounted) {

          setError(
            requestError?.message ||
            'Unable to load checkout information.'
          );

        }

      } finally {

        if (mounted) {
          setLoading(false);
        }

      }

    };


    loadCheckout();


    return () => {

      mounted = false;

    };

  }, [listingId]);


  /*
  ----------------------------------------------------------
  TOTAL
  ----------------------------------------------------------
  */

  const unitPrice =
    Number(
      listing?.price
    ) || 0;


  const subtotal =
    useMemo(
      () =>
        Number(
          (
            unitPrice *
            Number(quantity)
          ).toFixed(2)
        ),

      [
        unitPrice,
        quantity
      ]
    );


  /*
  ----------------------------------------------------------
  SELLER NAME
  ----------------------------------------------------------
  */

  const sellerName =
    listing?.seller?.name ||
    'Seller';


  /*
  ----------------------------------------------------------
  IMAGE
  ----------------------------------------------------------
  */

  const imageUrl =
    normalizeImage(
      listing?.image_url
    );


  /*
  ----------------------------------------------------------
  QUANTITY
  ----------------------------------------------------------
  */

  const availableQuantity =
    Number(
      listing?.quantity
    ) || 0;


  const decreaseQuantity = () => {

    setQuantity(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );

  };


  const increaseQuantity = () => {

    setQuantity(
      (current) =>
        Math.min(
          availableQuantity,
          current + 1
        )
    );

  };


  /*
  ----------------------------------------------------------
  PLACE ORDER
  ----------------------------------------------------------
  */

  const handlePlaceOrder = async (
    event
  ) => {

    event.preventDefault();


    if (!listing) {
      return;
    }


    setError('');


    /*
    Validate quantity.
    */

    if (
      quantity < 1 ||
      quantity > availableQuantity
    ) {

      setError(
        'Please select a valid quantity.'
      );

      return;

    }


    /*
    Validate address.
    */

    if (
      !shippingAddress.trim()
    ) {

      setError(
        'Please enter your shipping address.'
      );

      return;

    }


    /*
    Payment method.
    */

    if (!paymentMethod) {

      setError(
        'Please select a payment method.'
      );

      return;

    }


    try {

      setPlacingOrder(true);


      const response =
        await createBuyerOrder({

          listingId:
            Number(listingId),

          quantity:
            Number(quantity),

          shippingAddress:
            shippingAddress.trim(),

          paymentMethod,

          referenceNumber:
            referenceNumber.trim(),

          notes:
            notes.trim()

        });


      const order =
        response?.order ||
        response?.data?.order ||
        null;


      if (!order) {

        throw new Error(
          response?.message ||
          'Order was not created.'
        );

      }


      setSuccessOrder(
        order
      );

    } catch (requestError) {

      console.error(
        'Place order error:',
        requestError
      );


      setError(
        requestError?.message ||
        'Unable to place your order. Please try again.'
      );

    } finally {

      setPlacingOrder(false);

    }

  };


  /*
  ----------------------------------------------------------
  BACK
  ----------------------------------------------------------
  */

  const handleBack = () => {

    navigate(
      '/buyer/marketplace'
    );

  };


  /*
  ==========================================================
  LOADING
  ==========================================================
  */

  if (loading) {

    return (

      <div className="buyer-checkout-page">

        <div className="buyer-checkout-loading">

          <div className="buyer-checkout-spinner" />

          <p>
            Loading checkout...
          </p>

        </div>

      </div>

    );

  }


  /*
  ==========================================================
  SUCCESS
  ==========================================================
  */

  if (successOrder) {

    return (

      <div className="buyer-checkout-page">

        <div className="buyer-checkout-success">

          <div className="buyer-checkout-success-icon">

            <CheckCircle2
              size={58}
            />

          </div>


          <h1>
            Order Placed Successfully!
          </h1>


          <p className="buyer-checkout-success-text">

            Thank you for your order.
            Your order has been recorded
            successfully.

          </p>


          <div className="buyer-checkout-order-number">

            <span>
              Order Number
            </span>

            <strong>
              {successOrder.order_number}
            </strong>

          </div>


          <div className="buyer-checkout-success-total">

            <span>
              Total Amount
            </span>

            <strong>
              ₱{formatMoney(
                successOrder.total_amount
              )}
            </strong>

          </div>


          <div className="buyer-checkout-success-actions">

            <button
              type="button"
              className="buyer-checkout-primary-btn"
              onClick={() =>
                navigate(
                  `/buyer/orders/${successOrder.order_id}`
                )
              }
            >

              <Package
                size={18}
              />

              View Order

            </button>


            <button
              type="button"
              className="buyer-checkout-secondary-btn"
              onClick={() =>
                navigate(
                  '/buyer/orders'
                )
              }
            >

              My Orders

            </button>


            <button
              type="button"
              className="buyer-checkout-text-btn"
              onClick={() =>
                navigate(
                  '/buyer/marketplace'
                )
              }
            >

              Continue Shopping

            </button>

          </div>

        </div>

      </div>

    );

  }


  /*
  ==========================================================
  ERROR WITHOUT LISTING
  ==========================================================
  */

  if (!listing) {

    return (

      <div className="buyer-checkout-page">

        <div className="buyer-checkout-error-state">

          <XCircle
            size={52}
          />

          <h2>
            Checkout Unavailable
          </h2>

          <p>
            {error ||
              'The selected item is unavailable.'}
          </p>

          <button
            type="button"
            className="buyer-checkout-primary-btn"
            onClick={handleBack}
          >

            <ArrowLeft
              size={18}
            />

            Back to Marketplace

          </button>

        </div>

      </div>

    );

  }


  /*
  ==========================================================
  MAIN
  ==========================================================
  */

  return (

    <div className="buyer-checkout-page">

      <div className="buyer-checkout-container">


        {/* -------------------------------------------------
            TOP
        ------------------------------------------------- */}

        <div className="buyer-checkout-top">

          <button
            type="button"
            className="buyer-checkout-back-btn"
            onClick={handleBack}
          >

            <ArrowLeft
              size={18}
            />

            Back to Marketplace

          </button>


          <div className="buyer-checkout-heading">

            <ShoppingBag
              size={25}
            />

            <div>

              <h1>
                Checkout
              </h1>

              <p>
                Review your order before placing it.
              </p>

            </div>

          </div>

        </div>


        {/* -------------------------------------------------
            ERROR
        ------------------------------------------------- */}

        {error && (

          <div className="buyer-checkout-alert">

            <XCircle
              size={20}
            />

            <span>
              {error}
            </span>

          </div>

        )}


        {/* -------------------------------------------------
            CONTENT
        ------------------------------------------------- */}

        <form
          className="buyer-checkout-grid"
          onSubmit={handlePlaceOrder}
        >


          {/* =================================================
              LEFT
          ================================================= */}

          <div className="buyer-checkout-left">


            {/* ------------------------------------------------
                PRODUCT
            ------------------------------------------------ */}

            <section className="buyer-checkout-card">

              <div className="buyer-checkout-card-header">

                <div>

                  <h2>
                    Order Item
                  </h2>

                  <p>
                    Item you are purchasing
                  </p>

                </div>

              </div>


              <div className="buyer-checkout-product">

                <div className="buyer-checkout-product-image">

                  {imageUrl ? (

                    <img
                      src={imageUrl}
                      alt={listing.title}
                    />

                  ) : (

                    <div className="buyer-checkout-no-image">

                      <Package
                        size={38}
                      />

                    </div>

                  )}

                </div>


                <div className="buyer-checkout-product-info">

                  <h3>
                    {listing.title}
                  </h3>


                  {listing.category_name && (

                    <span className="buyer-checkout-category">

                      {listing.category_name}

                    </span>

                  )}


                  <div className="buyer-checkout-product-meta">

                    {listing.condition && (

                      <span>
                        Condition: {listing.condition}
                      </span>

                    )}

                    {listing.location && (

                      <span>

                        <MapPin
                          size={14}
                        />

                        {listing.location}

                      </span>

                    )}

                  </div>


                  <div className="buyer-checkout-seller">

                    <User
                      size={15}
                    />

                    Sold by:
                    <strong>
                      {sellerName}
                    </strong>

                  </div>

                </div>


                <div className="buyer-checkout-product-price">

                  <span>
                    ₱{formatMoney(unitPrice)}
                  </span>

                  <small>
                    each
                  </small>

                </div>

              </div>

            </section>


            {/* ------------------------------------------------
                QUANTITY
            ------------------------------------------------ */}

            <section className="buyer-checkout-card">

              <div className="buyer-checkout-card-header">

                <div>

                  <h2>
                    Quantity
                  </h2>

                  <p>
                    Select how many you want to purchase.
                  </p>

                </div>

              </div>


              <div className="buyer-checkout-quantity-row">

                <div className="buyer-checkout-quantity-control">

                  <button
                    type="button"
                    onClick={
                      decreaseQuantity
                    }
                    disabled={
                      quantity <= 1 ||
                      placingOrder
                    }
                  >

                    <Minus
                      size={17}
                    />

                  </button>


                  <span>
                    {quantity}
                  </span>


                  <button
                    type="button"
                    onClick={
                      increaseQuantity
                    }
                    disabled={
                      quantity >=
                        availableQuantity ||
                      placingOrder
                    }
                  >

                    <Plus
                      size={17}
                    />

                  </button>

                </div>


                <div className="buyer-checkout-stock">

                  <Package
                    size={17}
                  />

                  {availableQuantity} available

                </div>

              </div>

            </section>


            {/* ------------------------------------------------
                SHIPPING
            ------------------------------------------------ */}

            <section className="buyer-checkout-card">

              <div className="buyer-checkout-card-header">

                <div>

                  <h2>
                    Shipping Information
                  </h2>

                  <p>
                    Where should we deliver your order?
                  </p>

                </div>

                <MapPin
                  size={22}
                />

              </div>


              <label className="buyer-checkout-label">

                Shipping Address
                <span>
                  *
                </span>

              </label>


              <textarea
                value={shippingAddress}
                onChange={(event) =>
                  setShippingAddress(
                    event.target.value
                  )
                }
                placeholder="Enter your complete shipping address"
                rows={4}
                disabled={placingOrder}
                required
              />


              <div className="buyer-checkout-shipping-note">

                <Truck
                  size={17}
                />

                <span>
                  Please provide a complete and accurate
                  delivery address.
                </span>

              </div>

            </section>


            {/* ------------------------------------------------
                PAYMENT
            ------------------------------------------------ */}

            <section className="buyer-checkout-card">

              <div className="buyer-checkout-card-header">

                <div>

                  <h2>
                    Payment Method
                  </h2>

                  <p>
                    Select how you want to pay.
                  </p>

                </div>

                <CreditCard
                  size={22}
                />

              </div>


              <div className="buyer-checkout-payment-options">


                <label
                  className={
                    `buyer-checkout-payment-option ${
                      paymentMethod ===
                      'CASH_ON_DELIVERY'
                        ? 'selected'
                        : ''
                    }`
                  }
                >

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH_ON_DELIVERY"
                    checked={
                      paymentMethod ===
                      'CASH_ON_DELIVERY'
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    disabled={placingOrder}
                  />

                  <div className="buyer-checkout-payment-icon">

                    <Truck
                      size={20}
                    />

                  </div>

                  <div>

                    <strong>
                      Cash on Delivery
                    </strong>

                    <span>
                      Pay when your order arrives.
                    </span>

                  </div>

                </label>


                <label
                  className={
                    `buyer-checkout-payment-option ${
                      paymentMethod === 'GCASH'
                        ? 'selected'
                        : ''
                    }`
                  }
                >

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="GCASH"
                    checked={
                      paymentMethod ===
                      'GCASH'
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    disabled={placingOrder}
                  />

                  <div className="buyer-checkout-payment-icon">

                    <Wallet
                      size={20}
                    />

                  </div>

                  <div>

                    <strong>
                      GCash
                    </strong>

                    <span>
                      Payment will remain pending
                      until verified.
                    </span>

                  </div>

                </label>


                <label
                  className={
                    `buyer-checkout-payment-option ${
                      paymentMethod ===
                      'BANK_TRANSFER'
                        ? 'selected'
                        : ''
                    }`
                  }
                >

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANK_TRANSFER"
                    checked={
                      paymentMethod ===
                      'BANK_TRANSFER'
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    disabled={placingOrder}
                  />

                  <div className="buyer-checkout-payment-icon">

                    <CreditCard
                      size={20}
                    />

                  </div>

                  <div>

                    <strong>
                      Bank Transfer
                    </strong>

                    <span>
                      Payment will remain pending
                      until verified.
                    </span>

                  </div>

                </label>


                <label
                  className={
                    `buyer-checkout-payment-option ${
                      paymentMethod === 'OTHER'
                        ? 'selected'
                        : ''
                    }`
                  }
                >

                  <input
                    type="radio"
                    name="paymentMethod"
                    value="OTHER"
                    checked={
                      paymentMethod ===
                      'OTHER'
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value
                      )
                    }
                    disabled={placingOrder}
                  />

                  <div className="buyer-checkout-payment-icon">

                    <CreditCard
                      size={20}
                    />

                  </div>

                  <div>

                    <strong>
                      Other
                    </strong>

                    <span>
                      Other supported payment arrangement.
                    </span>

                  </div>

                </label>

              </div>


              {(paymentMethod === 'GCASH' ||
                paymentMethod === 'BANK_TRANSFER') && (

                <div className="buyer-checkout-reference">

                  <label className="buyer-checkout-label">

                    Reference Number
                    <span className="optional">
                      Optional
                    </span>

                  </label>

                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(event) =>
                      setReferenceNumber(
                        event.target.value
                      )
                    }
                    placeholder="Enter payment reference number if available"
                    disabled={placingOrder}
                  />

                </div>

              )}

            </section>


            {/* ------------------------------------------------
                NOTES
            ------------------------------------------------ */}

            <section className="buyer-checkout-card">

              <div className="buyer-checkout-card-header">

                <div>

                  <h2>
                    Order Notes
                  </h2>

                  <p>
                    Additional instructions for your order.
                  </p>

                </div>

              </div>


              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="Optional notes for the seller..."
                rows={3}
                disabled={placingOrder}
              />

            </section>

          </div>


          {/* =================================================
              RIGHT - ORDER SUMMARY
          ================================================= */}

          <aside className="buyer-checkout-summary">

            <div className="buyer-checkout-summary-card">

              <div className="buyer-checkout-summary-header">

                <h2>
                  Order Summary
                </h2>

                <ShoppingBag
                  size={21}
                />

              </div>


              <div className="buyer-checkout-summary-item">

                <span>
                  {listing.title}
                </span>

                <strong>
                  ₱{formatMoney(
                    unitPrice
                  )}
                </strong>

              </div>


              <div className="buyer-checkout-summary-row">

                <span>
                  Unit Price
                </span>

                <span>
                  ₱{formatMoney(
                    unitPrice
                  )}
                </span>

              </div>


              <div className="buyer-checkout-summary-row">

                <span>
                  Quantity
                </span>

                <span>
                  × {quantity}
                </span>

              </div>


              <div className="buyer-checkout-summary-divider" />


              <div className="buyer-checkout-summary-row">

                <span>
                  Subtotal
                </span>

                <span>
                  ₱{formatMoney(
                    subtotal
                  )}
                </span>

              </div>


              <div className="buyer-checkout-summary-row">

                <span>
                  Shipping
                </span>

                <span className="free">
                  To be arranged
                </span>

              </div>


              <div className="buyer-checkout-summary-divider" />


              <div className="buyer-checkout-total">

                <span>
                  Total
                </span>

                <strong>
                  ₱{formatMoney(
                    subtotal
                  )}
                </strong>

              </div>


              <button
                type="submit"
                className="buyer-checkout-place-order-btn"
                disabled={
                  placingOrder ||
                  !shippingAddress.trim() ||
                  quantity < 1
                }
              >

                {placingOrder ? (

                  <>
                    <span className="buyer-checkout-button-spinner" />

                    Placing Order...

                  </>

                ) : (

                  <>
                    <CheckCircle2
                      size={19}
                    />

                    Place Order

                  </>

                )}

              </button>


              <p className="buyer-checkout-secure-note">

                <CheckCircle2
                  size={14}
                />

                Your order information is securely
                processed through ReUseConnect.

              </p>

            </div>


            <div className="buyer-checkout-help-card">

              <Package
                size={20}
              />

              <div>

                <strong>
                  After placing your order
                </strong>

                <p>
                  You can track your order status
                  from My Orders.
                </p>

              </div>

            </div>

          </aside>

        </form>

      </div>

    </div>

  );

};


export default BuyerCheckout;