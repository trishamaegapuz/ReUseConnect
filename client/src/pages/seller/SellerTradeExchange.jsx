import React, {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  Search,
  RefreshCw,
  Eye,
  X,
  Package,
  UserRound,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MapPin,
  Send,
  Paperclip
} from 'lucide-react';

import {
  getSellerTradePosts,
  getSellerTradePost,
  getSellerTradeComments,
  getSellerTradeItems,
  addSellerTradeComment
} from '../../services/seller/sellerTradeExchangeApi';

import '../../styles/seller/SellerTradeExchange.css';


const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};


const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `₱${number.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;
};


const getDisplayName = (item) => {
  if (!item) return 'Community Member';

  const name = [
    item.first_name,
    item.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    item.name ||
    item.email ||
    'Community Member'
  );
};


const getImageUrl = (item) => {
  return (
    item?.image_url ||
    item?.imageUrl ||
    item?.image ||
    ''
  );
};


const getLocation = (item) => {
  return (
    item?.location ||
    item?.listing_location ||
    item?.city ||
    item?.province ||
    ''
  );
};


const SellerTradeExchange = () => {

  const [posts, setPosts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [tradeType, setTradeType] =
    useState('all');

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 6,
      total: 0,
      totalPages: 1
    });

  const [selectedPost, setSelectedPost] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState('');

  const [comments, setComments] =
    useState([]);

  const [commentsLoading, setCommentsLoading] =
    useState(false);

  const [commentText, setCommentText] =
    useState('');

  const [commentError, setCommentError] =
    useState('');

  const [commentSending, setCommentSending] =
    useState(false);

  const [items, setItems] =
    useState([]);

  const [itemsLoading, setItemsLoading] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [showItemPicker, setShowItemPicker] =
    useState(false);


  const loadPosts = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const result =
          await getSellerTradePosts({
            search,
            type: tradeType,
            page,
            limit: 6
          });

        const nextItems =
          Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.data)
              ? result.data
              : Array.isArray(result)
                ? result
                : [];

        setPosts(nextItems);

        setPagination(
          result?.pagination || {
            page,
            limit: 6,
            total: nextItems.length,
            totalPages: 1
          }
        );

      } catch (err) {
        setError(
          err?.message ||
          'Unable to load Trade & Exchange posts.'
        );

        setPosts([]);

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, tradeType, page]
  );


  useEffect(() => {
    loadPosts();
  }, [loadPosts]);


  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(
      searchInput.trim()
    );
  };


  const loadComments = useCallback(
    async (postId) => {
      if (!postId) return;

      try {
        setCommentsLoading(true);
        setCommentError('');

        const result =
          await getSellerTradeComments(
            postId
          );

        const nextComments =
          Array.isArray(result?.comments)
            ? result.comments
            : Array.isArray(result?.items)
              ? result.items
              : Array.isArray(result?.data)
                ? result.data
                : [];

        setComments(nextComments);

      } catch (err) {
        setComments([]);
        setCommentError(
          err?.message ||
          'Unable to load comments.'
        );

      } finally {
        setCommentsLoading(false);
      }
    },
    []
  );


  const loadMyItems = useCallback(
    async () => {
      try {
        setItemsLoading(true);

        const result =
          await getSellerTradeItems();

        const nextItems =
          Array.isArray(result?.items)
            ? result.items
            : Array.isArray(result?.data)
              ? result.data
              : [];

        setItems(nextItems);

      } catch (err) {
        setCommentError(
          err?.message ||
          'Unable to load your items.'
        );

        setItems([]);

      } finally {
        setItemsLoading(false);
      }
    },
    []
  );


  const openDetails = async (post) => {
    setSelectedPost(post);
    setDetailsError('');
    setCommentError('');
    setComments([]);
    setCommentText('');
    setSelectedItem(null);
    setShowItemPicker(false);
    setDetailsLoading(true);

    try {
      const result =
        await getSellerTradePost(
          post.post_id
        );

      const detail =
        result?.post ||
        result?.data ||
        result;

      if (detail) {
        setSelectedPost(detail);
      }

      await Promise.all([
        loadComments(post.post_id),
        loadMyItems()
      ]);

    } catch (err) {
      setDetailsError(
        err?.message ||
        'Unable to load post details.'
      );

    } finally {
      setDetailsLoading(false);
    }
  };


  const closeDetails = () => {
    setSelectedPost(null);
    setDetailsError('');
    setCommentError('');
    setComments([]);
    setCommentText('');
    setSelectedItem(null);
    setShowItemPicker(false);
  };


  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setShowItemPicker(false);
  };


  const handleSendComment = async (event) => {
    event.preventDefault();

    if (!selectedPost?.post_id) {
      return;
    }

    const text =
      commentText.trim();

    if (!text) {
      setCommentError(
        'Please enter a comment.'
      );
      return;
    }

    try {
      setCommentSending(true);
      setCommentError('');

      const result =
        await addSellerTradeComment(
          selectedPost.post_id,
          text,
          selectedItem?.listing_id || null
        );

      const newComment =
        result?.comment;

      if (newComment) {
        setComments(
          (current) => [
            ...current,
            newComment
          ]
        );
      } else {
        await loadComments(
          selectedPost.post_id
        );
      }

      setCommentText('');
      setSelectedItem(null);

    } catch (err) {
      setCommentError(
        err?.message ||
        'Unable to send comment.'
      );

    } finally {
      setCommentSending(false);
    }
  };


  const totalPages =
    Math.max(
      1,
      Number(
        pagination?.totalPages || 1
      )
    );


  return (
    <div className="seller-trade-exchange">

      <section className="seller-trade-content-card">

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTradeType('all');
              setPage(1);
            }}
            style={{
              border: '1px solid rgba(92, 58, 180, 0.2)',
              borderRadius: '8px',
              padding: '7px 12px',
              background:
                tradeType === 'all'
                  ? '#5b2bbf'
                  : '#ffffff',
              color:
                tradeType === 'all'
                  ? '#ffffff'
                  : 'inherit',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => {
              setTradeType('trade');
              setPage(1);
            }}
            style={{
              border: '1px solid rgba(92, 58, 180, 0.2)',
              borderRadius: '8px',
              padding: '7px 12px',
              background:
                tradeType === 'trade'
                  ? '#5b2bbf'
                  : '#ffffff',
              color:
                tradeType === 'trade'
                  ? '#ffffff'
                  : 'inherit',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Trade &amp; Exchange
          </button>

          <button
            type="button"
            onClick={() => {
              setTradeType('donation');
              setPage(1);
            }}
            style={{
              border: '1px solid rgba(92, 58, 180, 0.2)',
              borderRadius: '8px',
              padding: '7px 12px',
              background:
                tradeType === 'donation'
                  ? '#5b2bbf'
                  : '#ffffff',
              color:
                tradeType === 'donation'
                  ? '#ffffff'
                  : 'inherit',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Donations
          </button>
        </div>

        <form
          className="seller-trade-search"
          onSubmit={handleSearch}
        >
          <Search size={17} />

          <input
            type="text"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value
              )
            }
            placeholder="Search trade posts..."
          />

          <button type="submit">
            Search
          </button>
        </form>


        {error && (
          <div className="seller-trade-error">
            {error}
          </div>
        )}


        {loading ? (
          <div className="seller-trade-empty">
            <RefreshCw
              size={28}
              className="seller-trade-spin"
            />

            <strong>
              Loading Trade &amp; Exchange posts...
            </strong>
          </div>
        ) : posts.length === 0 ? (
          <div className="seller-trade-empty">
            <div className="seller-trade-empty-icon">
              <Package size={30} />
            </div>

            <strong>
              No Trade &amp; Exchange posts found
            </strong>

            <span>
              No community trade posts match your search.
            </span>
          </div>
        ) : (
          <div className="seller-trade-grid">
            {posts.map((post) => {
              const imageUrl =
                getImageUrl(post);

              const location =
                getLocation(post);

              return (
                <article
                  className="seller-trade-card"
                  key={post.post_id}
                >
                  <div className="seller-trade-card-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={
                          post.title ||
                          'Trade item'
                        }
                        onError={(event) => {
                          event.currentTarget.style.display =
                            'none';

                          event.currentTarget.parentElement.classList.add(
                            'seller-trade-image-error'
                          );
                        }}
                      />
                    ) : (
                      <div className="seller-trade-image-placeholder">
                        <Package size={31} />
                        <span>
                          No image
                        </span>
                      </div>
                    )}

                    <span className="seller-trade-category">
                      {String(
                        post.listing_type || ''
                      ).toUpperCase() === 'DONATION'
                        ? 'Donations'
                        : 'Trade & Exchange'}
                    </span>
                  </div>


                  <div className="seller-trade-card-content">

                    <h3>
                      {post.title ||
                        'Untitled Trade Post'}
                    </h3>

                    <p className="seller-trade-card-description">
                      {post.body ||
                        'No description provided.'}
                    </p>

                    <div className="seller-trade-card-meta">

                      <div>
                        <UserRound size={13} />
                        <span>
                          {getDisplayName(post)}
                        </span>
                      </div>

                      <div>
                        <CalendarDays size={13} />
                        <span>
                          {formatDate(
                            post.created_at
                          )}
                        </span>
                      </div>

                      {location && (
                        <div>
                          <MapPin size={13} />
                          <span>
                            {location}
                          </span>
                        </div>
                      )}

                    </div>


                    <button
                      type="button"
                      className="seller-trade-view-button"
                      onClick={() =>
                        openDetails(post)
                      }
                    >
                      <Eye size={15} />
                      View Details
                    </button>

                  </div>
                </article>
              );
            })}
          </div>
        )}


        {!loading &&
          posts.length > 0 && (
          <div className="seller-trade-pagination">

            <span>
              Page {pagination.page || page}
              {' '}of{' '}
              {totalPages}
            </span>

            <div>
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
                disabled={
                  page <= 1
                }
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                  )
                }
                disabled={
                  page >= totalPages
                }
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </div>
        )}

      </section>


      {/* =====================================================
          TRADE POST + SHARED COMMENTS
      ===================================================== */}

      {selectedPost && (
        <div
          className="seller-trade-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >

          <div
            className="seller-trade-modal"
            style={{
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >

            <div className="seller-trade-modal-header">

              <div>
                <span>
                  {String(
                    selectedPost.listing_type || ''
                  ).toUpperCase() === 'DONATION'
                    ? 'DONATIONS'
                    : 'TRADE & EXCHANGE'}
                </span>

                <h2>
                  {selectedPost.title ||
                    'Trade Post'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </div>


            {detailsLoading ? (
              <div className="seller-trade-modal-loading">

                <RefreshCw
                  size={24}
                  className="seller-trade-spin"
                />

                Loading details...

              </div>
            ) : (
              <div className="seller-trade-modal-body">

                {detailsError && (
                  <div className="seller-trade-error">
                    {detailsError}
                  </div>
                )}


                {getImageUrl(selectedPost) ? (
                  <img
                    className="seller-trade-modal-image"
                    src={getImageUrl(selectedPost)}
                    alt={
                      selectedPost.title ||
                      'Trade item'
                    }
                  />
                ) : (
                  <div className="seller-trade-modal-placeholder">
                    <Package size={35} />
                    <span>
                      No image available
                    </span>
                  </div>
                )}


                <div className="seller-trade-modal-info">

                  <div>
                    <UserRound size={16} />

                    <section>
                      <small>
                        Posted by
                      </small>

                      <strong>
                        {getDisplayName(
                          selectedPost
                        )}
                      </strong>
                    </section>
                  </div>


                  <div>
                    <CalendarDays size={16} />

                    <section>
                      <small>
                        Posted on
                      </small>

                      <strong>
                        {formatDate(
                          selectedPost.created_at
                        )}
                      </strong>
                    </section>
                  </div>


                  {getLocation(selectedPost) && (
                    <div>
                      <MapPin size={16} />

                      <section>
                        <small>
                          Location
                        </small>

                        <strong>
                          {getLocation(
                            selectedPost
                          )}
                        </strong>
                      </section>
                    </div>
                  )}

                </div>


                <div className="seller-trade-modal-description">

                  <span>
                    Description
                  </span>

                  <p>
                    {selectedPost.body ||
                      'No description provided.'}
                  </p>

                </div>


                {/* =================================================
                    COMMENTS
                ================================================= */}

                <div
                  style={{
                    marginTop: '18px',
                    borderTop:
                      '1px solid rgba(92, 58, 180, 0.15)',
                    paddingTop: '16px'
                  }}
                >

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginBottom: '12px'
                    }}
                  >
                    <MessageCircle size={16} />

                    <strong>
                      Comments
                    </strong>
                  </div>


                  {commentsLoading ? (
                    <div
                      style={{
                        padding: '18px 0',
                        textAlign: 'center'
                      }}
                    >
                      <RefreshCw
                        size={19}
                        className="seller-trade-spin"
                      />
                      <div>
                        Loading comments...
                      </div>
                    </div>
                  ) : comments.length === 0 ? (
                    <div
                      style={{
                        padding: '12px 0',
                        fontSize: '13px',
                        opacity: 0.7
                      }}
                    >
                      No comments yet. Start the trade discussion.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        paddingRight: '3px'
                      }}
                    >
                      {comments.map((comment) => (
                        <div
                          key={comment.comment_id}
                          style={{
                            border:
                              '1px solid rgba(92, 58, 180, 0.14)',
                            borderRadius: '10px',
                            padding: '10px',
                            background:
                              'rgba(247, 244, 255, 0.55)'
                          }}
                        >

                          <div
                            style={{
                              display: 'flex',
                              justifyContent:
                                'space-between',
                              gap: '10px',
                              marginBottom: '5px'
                            }}
                          >
                            <strong
                              style={{
                                fontSize: '12px'
                              }}
                            >
                              {getDisplayName(
                                comment
                              )}
                            </strong>

                            <span
                              style={{
                                fontSize: '10px',
                                opacity: 0.65
                              }}
                            >
                              {formatDate(
                                comment.created_at
                              )}
                            </span>
                          </div>


                          <div
                            style={{
                              fontSize: '12px',
                              lineHeight: 1.5
                            }}
                          >
                            {comment.comment_text}
                          </div>


                          {comment.listing_id && (
                            <div
                              style={{
                                marginTop: '9px',
                                border:
                                  '1px solid rgba(92, 58, 180, 0.18)',
                                borderRadius: '9px',
                                padding: '7px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '9px',
                                background: '#ffffff'
                              }}
                            >

                              {comment.listing_image_url ? (
                                <img
                                  src={
                                    comment.listing_image_url
                                  }
                                  alt={
                                    comment.listing_title ||
                                    'Attached item'
                                  }
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    objectFit: 'cover',
                                    borderRadius: '7px'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '7px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background:
                                      '#f3f0fa'
                                  }}
                                >
                                  <Package size={21} />
                                </div>
                              )}

                              <div>
                                <strong
                                  style={{
                                    display: 'block',
                                    fontSize: '12px'
                                  }}
                                >
                                  {comment.listing_title ||
                                    'Attached Item'}
                                </strong>

                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '11px',
                                    opacity: 0.75,
                                    marginTop: '2px'
                                  }}
                                >
                                  {Number(
                                    comment.listing_price
                                  ) > 0
                                    ? formatPrice(
                                        comment.listing_price
                                      )
                                    : 'For Trade'}
                                </span>
                              </div>

                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}


                  {commentError && (
                    <div
                      className="seller-trade-error"
                      style={{
                        marginTop: '10px'
                      }}
                    >
                      {commentError}
                    </div>
                  )}


                  {/* ITEM PICKER */}

                  {showItemPicker && (
                    <div
                      style={{
                        marginTop: '10px',
                        border:
                          '1px solid rgba(92, 58, 180, 0.18)',
                        borderRadius: '10px',
                        padding: '9px',
                        background: '#ffffff'
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          justifyContent:
                            'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '12px'
                          }}
                        >
                          Import an item
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            setShowItemPicker(false)
                          }
                          style={{
                            border: 'none',
                            background:
                              'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>


                      {itemsLoading ? (
                        <div
                          style={{
                            padding: '10px',
                            textAlign: 'center'
                          }}
                        >
                          Loading your items...
                        </div>
                      ) : items.length === 0 ? (
                        <div
                          style={{
                            padding: '10px',
                            fontSize: '12px',
                            opacity: 0.7
                          }}
                        >
                          You have no available items to import.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '7px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                          }}
                        >
                          {items.map((item) => (
                            <button
                              type="button"
                              key={item.listing_id}
                              onClick={() =>
                                handleSelectItem(item)
                              }
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '9px',
                                width: '100%',
                                border:
                                  '1px solid rgba(92, 58, 180, 0.14)',
                                borderRadius: '8px',
                                padding: '7px',
                                background:
                                  selectedItem?.listing_id ===
                                  item.listing_id
                                    ? '#f1ebff'
                                    : '#ffffff',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >

                              {item.listing_image_url ? (
                                <img
                                  src={
                                    item.listing_image_url
                                  }
                                  alt={
                                    item.title ||
                                    'Item'
                                  }
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    objectFit: 'cover',
                                    borderRadius: '6px'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background:
                                      '#f3f0fa'
                                  }}
                                >
                                  <Package size={18} />
                                </div>
                              )}

                              <div>
                                <strong
                                  style={{
                                    display: 'block',
                                    fontSize: '11px'
                                  }}
                                >
                                  {item.title ||
                                    'Untitled Item'}
                                </strong>

                                <span
                                  style={{
                                    fontSize: '10px',
                                    opacity: 0.7
                                  }}
                                >
                                  {Number(item.price) > 0
                                    ? formatPrice(
                                        item.price
                                      )
                                    : item.listing_type ||
                                      'Item'}
                                </span>
                              </div>

                            </button>
                          ))}
                        </div>
                      )}

                    </div>
                  )}


                  {/* SELECTED ITEM */}

                  {selectedItem && (
                    <div
                      style={{
                        marginTop: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: '9px',
                        border:
                          '1px solid rgba(92, 58, 180, 0.18)',
                        borderRadius: '9px',
                        padding: '7px',
                        background: '#ffffff'
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >

                        {selectedItem.listing_image_url ? (
                          <img
                            src={
                              selectedItem.listing_image_url
                            }
                            alt={
                              selectedItem.title ||
                              'Selected item'
                            }
                            style={{
                              width: '45px',
                              height: '45px',
                              objectFit: 'cover',
                              borderRadius: '6px'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background:
                                '#f3f0fa'
                            }}
                          >
                            <Package size={18} />
                          </div>
                        )}

                        <div>
                          <strong
                            style={{
                              display: 'block',
                              fontSize: '11px'
                            }}
                          >
                            {selectedItem.title ||
                              'Selected Item'}
                          </strong>

                          <span
                            style={{
                              fontSize: '10px',
                              opacity: 0.7
                            }}
                          >
                            Item attached
                          </span>
                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItem(null)
                        }
                        style={{
                          border: 'none',
                          background:
                            'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={15} />
                      </button>

                    </div>
                  )}


                  {/* COMMENT COMPOSER */}

                  <form
                    onSubmit={handleSendComment}
                    style={{
                      marginTop: '10px'
                    }}
                  >

                    <textarea
                      value={commentText}
                      onChange={(event) =>
                        setCommentText(
                          event.target.value
                        )
                      }
                      placeholder="Write a comment..."
                      rows={3}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        border:
                          '1px solid rgba(92, 58, 180, 0.2)',
                        borderRadius: '9px',
                        padding: '9px 10px',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />


                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '7px'
                      }}
                    >

                      <button
                        type="button"
                        onClick={() =>
                          setShowItemPicker(
                            (current) => !current
                          )
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          border:
                            '1px solid rgba(92, 58, 180, 0.22)',
                          borderRadius: '7px',
                          padding: '7px 9px',
                          background: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        <Paperclip size={14} />
                        Import Item
                      </button>


                      <button
                        type="submit"
                        disabled={
                          commentSending ||
                          !commentText.trim()
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: 'none',
                          borderRadius: '7px',
                          padding: '8px 12px',
                          cursor:
                            commentSending ||
                            !commentText.trim()
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            commentSending ||
                            !commentText.trim()
                              ? 0.55
                              : 1,
                          background:
                            '#5b2bbf',
                          color: '#ffffff',
                          fontSize: '11px'
                        }}
                      >
                        <Send size={14} />
                        {commentSending
                          ? 'Sending...'
                          : 'Comment'}
                      </button>

                    </div>

                  </form>

                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};


export default SellerTradeExchange;
