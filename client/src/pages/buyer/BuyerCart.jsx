import React, {
  useEffect,
  useState
} from 'react';

import {
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Package,
  RefreshCw,
  X
} from 'lucide-react';

import {
  getCart,
  updateCartItem,
  removeFromCart
} from '../../services/buyer/buyerMarketplaceApi';

import '../../styles/buyer/BuyerCart.css';


const peso = (value) => {

  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );

};


const getId = (item) => {

  return (
    item?.listing_id ||
    item?.listing?.listing_id ||
    item?.id
  );

};


const getImage = (item) => {

  return (
    item?.image_url ||
    item?.primary_image ||
    item?.listing?.image_url ||
    null
  );

};


const getName = (item) => {

  return (
    item?.title ||
    item?.name ||
    item?.listing?.title ||
    'Unnamed Item'
  );

};


export default function BuyerCart() {

  const [
    items,
    setItems
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState('');

  const [
    selectedItem,
    setSelectedItem
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
    notes,
    setNotes
  ] = useState('');

  const [
    placingOrder,
    setPlacingOrder
  ] = useState(false);


  const loadCart =
    async () => {

      try {

        setLoading(true);
        setError('');


        const response =
          await getCart();


        const cart =
          response?.items ||
          response?.cart ||
          response?.data?.items ||
          response?.data?.cart ||
          response?.data ||
          [];


        setItems(
          Array.isArray(cart)
            ? cart
            : []
        );

      } catch (err) {

        console.error(
          'Buyer cart error:',
          err
        );

        setError(
          err?.message ||
          'Unable to load your cart.'
        );

      } finally {

        setLoading(false);

      }

    };


  useEffect(() => {

    loadCart();

  }, []);


  const handleUpdateQuantity =
    async (
      item,
      nextQuantity
    ) => {

      const listingId =
        getId(item);


      const maxQuantity =
        Number(
          item?.available_quantity ??
          item?.quantity ??
          1
        );


      if (
        nextQuantity < 1 ||
        nextQuantity > maxQuantity
      ) {
        return;
      }


      try {

        await updateCartItem(
          listingId,
          nextQuantity
        );


        await loadCart();


        window.dispatchEvent(
          new CustomEvent(
            'buyer-cart-updated'
          )
        );

      } catch (err) {

        setError(
          err?.message ||
          'Unable to update cart.'
        );

      }

    };


  const handleRemove =
    async (item) => {

      const cartItemId =
        item?.cart_item_id;


      if (!cartItemId) {
        return;
      }


      try {

        await removeFromCart(
          cartItemId
        );


        await loadCart();


        window.dispatchEvent(
          new CustomEvent(
            'buyer-cart-updated'
          )
        );

      } catch (err) {

        setError(
          err?.message ||
          'Unable to remove item.'
        );

      }

    };


  const openBuyNow =
    (item) => {

      const availableQuantity =
        Number(
          item?.available_quantity ??
          item?.quantity ??
          1
        );


      if (
        String(
          item?.status || ''
        ).toUpperCase() !==
        'AVAILABLE'
      ) {

        setError(
          'This item is no longer available.'
        );

        return;

      }


      setQuantity(
        Math.max(
          1,
          Number(
            item?.cart_quantity ||
            item?.quantity ||
            1
          )
        )
      );


      if (
        availableQuantity > 0
      ) {

        setSelectedItem(
          item
        );

      }

    };


  const handlePlaceOrder =
    async (event) => {

      event.preventDefault();


      if (!selectedItem) {
        return;
      }


      try {

        setPlacingOrder(true);


        const response =
          await fetch(
            'http://localhost:5000/api/buyer/orders',
            {
              method: 'POST',

              headers: {

                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${
                    localStorage.getItem(
                      'token'
                    ) ||
                    localStorage.getItem(
                      'authToken'
                    ) ||
                    localStorage.getItem(
                      'accessToken'
                    ) ||
                    ''
                  }`

              },

              body:
                JSON.stringify({

                  listingId:
                    getId(
                      selectedItem
                    ),

                  quantity:
                    Number(
                      quantity
                    ),

                  shippingAddress:
                    shippingAddress.trim(),

                  paymentMethod,

                  notes:
                    notes.trim()

                })

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data?.message ||
            'Unable to place order.'
          );

        }


        setSelectedItem(
          null
        );

        setShippingAddress('');
        setNotes('');
        setQuantity(1);


        await loadCart();


        window.dispatchEvent(
          new CustomEvent(
            'buyer-cart-updated'
          )
        );

        alert(
          data?.message ||
          'Order placed successfully.'
        );

      } catch (err) {

        setError(
          err?.message ||
          'Unable to place order.'
        );

      } finally {

        setPlacingOrder(false);

      }

    };


  const total =
    items.reduce(
      (
        sum,
        item
      ) => {

        const price =
          Number(
            item?.price || 0
          );

        const qty =
          Number(
            item?.cart_quantity ||
            item?.quantity ||
            1
          );

        return (
          sum +
          price *
          qty
        );

      },
      0
    );


  return (

    <main className="buyer-cart-page">

      <div className="buyer-cart-heading">

        <h1>
          My Cart
        </h1>

        <p>
          Items you added to your shopping cart.
        </p>

      </div>


      {error && (

        <div className="buyer-cart-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            <X size={14} />
          </button>

        </div>

      )}


      {loading ? (

        <div className="buyer-cart-loading">

          <RefreshCw
            size={24}
            className="buyer-cart-spin"
          />

          <span>
            Loading your cart...
          </span>

        </div>

      ) : items.length === 0 ? (

        <div className="buyer-cart-empty">

          <ShoppingCart
            size={48}
          />

          <h2>
            Your cart is empty
          </h2>

          <p>
            Add items from the Marketplace
            to see them here.
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.href =
                '/buyer/marketplace'
            }
          >
            Browse Marketplace
          </button>

        </div>

      ) : (

        <div className="buyer-cart-layout">

          <section className="buyer-cart-items">

            {items.map(
              (item) => {

                const id =
                  getId(item);

                const image =
                  getImage(item);

                const itemName =
                  getName(item);

                const itemPrice =
                  Number(
                    item?.price || 0
                  );

                const itemQuantity =
                  Number(
                    item?.cart_quantity ||
                    1
                  );

                const availableQuantity =
                  Number(
                    item?.available_quantity ??
                    item?.quantity ??
                    1
                  );

                const isAvailable =
                  String(
                    item?.status || ''
                  ).toUpperCase() ===
                    'AVAILABLE' &&
                  availableQuantity > 0;


                return (

                  <article
                    className="buyer-cart-item"
                    key={
                      item?.cart_item_id ||
                      id
                    }
                  >

                    <div className="buyer-cart-item-image">

                      {image ? (

                        <img
                          src={image}
                          alt={itemName}
                        />

                      ) : (

                        <Package
                          size={35}
                        />

                      )}

                    </div>


                    <div className="buyer-cart-item-info">

                      <h3>
                        {itemName}
                      </h3>

                      <span>
                        {item?.category_name ||
                          'Marketplace Item'}
                      </span>

                      <strong>
                        {peso(
                          itemPrice
                        )}
                      </strong>


                      <div className="buyer-cart-status">

                        {isAvailable
                          ? `Available: ${availableQuantity}`
                          : 'Unavailable'}

                      </div>

                    </div>


                    <div className="buyer-cart-item-actions">

                      <div className="buyer-cart-quantity">

                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(
                              item,
                              itemQuantity - 1
                            )
                          }
                          disabled={
                            itemQuantity <= 1 ||
                            !isAvailable
                          }
                        >

                          <Minus
                            size={14}
                          />

                        </button>


                        <span>
                          {itemQuantity}
                        </span>


                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQuantity(
                              item,
                              itemQuantity + 1
                            )
                          }
                          disabled={
                            itemQuantity >=
                              availableQuantity ||
                            !isAvailable
                          }
                        >

                          <Plus
                            size={14}
                          />

                        </button>

                      </div>


                      <button
                        type="button"
                        className="buyer-cart-remove"
                        onClick={() =>
                          handleRemove(
                            item
                          )
                        }
                        title="Remove"
                      >

                        <Trash2
                          size={15}
                        />

                      </button>


                      <button
                        type="button"
                        className="buyer-cart-buy"
                        onClick={() =>
                          openBuyNow(
                            item
                          )
                        }
                        disabled={
                          !isAvailable
                        }
                      >

                        <ShoppingBag
                          size={15}
                        />

                        Buy Now

                      </button>

                    </div>

                  </article>

                );

              }
            )}

          </section>


          <aside className="buyer-cart-summary">

            <h2>
              Cart Summary
            </h2>


            <div>

              <span>
                Items
              </span>

              <strong>
                {items.length}
              </strong>

            </div>


            <div>

              <span>
                Total
              </span>

              <strong>
                {peso(total)}
              </strong>

            </div>


            <button
              type="button"
              onClick={() =>
                window.location.href =
                  '/buyer/marketplace'
              }
            >
              Continue Shopping
            </button>

          </aside>

        </div>

      )}


      {selectedItem && (

        <div
          className="buyer-cart-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget &&
              !placingOrder
            ) {

              setSelectedItem(
                null
              );

            }

          }}
        >

          <div
            className="buyer-cart-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="buyer-cart-modal-header">

              <div>

                <h2>
                  Buy Now
                </h2>

                <p>
                  Complete your order.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  !placingOrder &&
                  setSelectedItem(
                    null
                  )
                }
              >

                <X size={18} />

              </button>

            </div>


            <form
              onSubmit={
                handlePlaceOrder
              }
            >

              <div className="buyer-cart-modal-product">

                <div>

                  {getImage(
                    selectedItem
                  ) ? (

                    <img
                      src={
                        getImage(
                          selectedItem
                        )
                      }
                      alt={
                        getName(
                          selectedItem
                        )
                      }
                    />

                  ) : (

                    <Package
                      size={32}
                    />

                  )}

                </div>


                <section>

                  <strong>
                    {getName(
                      selectedItem
                    )}
                  </strong>

                  <span>
                    {peso(
                      selectedItem?.price
                    )}
                  </span>

                </section>

              </div>


              <label>

                <span>
                  Quantity
                </span>

                <input
                  type="number"
                  min="1"
                  max={
                    Number(
                      selectedItem?.available_quantity ??
                      selectedItem?.quantity ??
                      1
                    )
                  }
                  value={
                    quantity
                  }
                  onChange={(event) =>
                    setQuantity(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  required
                />

              </label>


              <label>

                <span>
                  Shipping Address
                </span>

                <textarea
                  value={
                    shippingAddress
                  }
                  onChange={(event) =>
                    setShippingAddress(
                      event.target.value
                    )
                  }
                  rows="3"
                  placeholder="Enter your complete shipping address"
                  required
                />

              </label>


              <label>

                <span>
                  Payment Method
                </span>

                <select
                  value={
                    paymentMethod
                  }
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value
                    )
                  }
                >

                  <option value="CASH_ON_DELIVERY">
                    Cash on Delivery
                  </option>

                  <option value="GCASH">
                    GCash
                  </option>

                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>

                  <option value="OTHER">
                    Other
                  </option>

                </select>

              </label>


              <label>

                <span>
                  Notes
                </span>

                <textarea
                  value={
                    notes
                  }
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows="2"
                  placeholder="Optional notes"
                />

              </label>


              <div className="buyer-cart-modal-total">

                <span>
                  Total
                </span>

                <strong>
                  {peso(
                    Number(
                      selectedItem?.price ||
                      0
                    ) *
                    Number(
                      quantity
                    )
                  )}
                </strong>

              </div>


              <div className="buyer-cart-modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedItem(
                      null
                    )
                  }
                  disabled={
                    placingOrder
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    placingOrder
                  }
                >

                  {placingOrder ? (

                    <>
                      <RefreshCw
                        size={14}
                        className="buyer-cart-spin"
                      />

                      Placing...
                    </>

                  ) : (

                    <>
                      <ShoppingBag
                        size={14}
                      />

                      Place Order
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </main>

  );

}