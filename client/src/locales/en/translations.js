export default {
  message: {
    common: {
      'system-error': 'System error',
      'data-not-found': 'Data not found',
    },
    plot: {
      'plot-mint-daily-limit-exceeded':
        '{{fail}} due to the plot minting limit was exceeded today',
      'insufficient-plot-health': 'insufficient plot health',
      'insufficient-rent-time':
        'Listing failed. Because it was less than 24 hours before the expiration of the plot management right.',
      occupy: {
        'blazer-occupy-limit-exceeded':
          '{{fail}} due to the plot occupation limit being exceeded ',
        'insufficient-occupy-time':
          'Listing failed. Because it needs to be occupied by you over 5 days before it can be listed',
        'mint-befor-occupy':
          'Purchase failed. Because you need to successfully mint an NFT on this plot before you can occupy or purchase it',
        'plot-already-occupied':
          '{{fail}}, and the plot has been occupied by others',
      },
    },
    token: {
      'insufficient-rosen': '{{fail}} due to insufficient available ROS',
      'insufficient-energy': '{{fail}} due to insufficient available ENERGY',
      'insufficient-token': '{{fail}} due to insufficient available token',
    },
    market: {
      'insufficient-relisting-cooldown-time':
        'Listing failed. Because it has been less than 24 hours since the last delisting',
      'listing-already-taken':
        'Purchase failed, and the {{item}} has been purchased by others',
      'listing-not-found':
        'Purchase failed, because you cannot purchase the plot listed by youself',
    },
    assets: {
      'no-private-wallet-for-receiver':
        'Receiver do not have connected private wallet',
    },
    exchange: {
      success:
        'Successfully redeem {{output_amount}} {{output_token}} by consuming {{input_amount}} {{input_token}}',
      'insufficent-founds':
        'Redeem failed due to insufficient available {{token}}',
    },
    member: {
      'invalid-username-password':
        'Incorrect username or password, please try again ',
      'invalid-username-verifycode':
        'Incorrect username or verification code, please try again ',
      'withdraw-amount-low':
        'Please enter the amount more than the minimum limit (50 USDT)',
    },

    occupy: {
      success:
        'Congrats! You successfully obtained the management rights of {{plot}}! Consumed {{amount}} {{token}}',
      fail: {
        limit:
          'Preemption failed due to the plot occupation limit being exceeded ',
        'insufficient-token':
          'Preemption failed due to insufficient available {{token}}',
        'unfinished-payment':
          'Preemption failed and the payment was not completed. (fiat currency)',
        taken: 'Preemption failed, and the plot has been occupied by others',
      },
    },
    mint: {
      success:
        'Congrats! You successfully minted {{quantity}} *NFTs (as your memories)! Consumed {{amount}} {{token}}',
      fail: {
        'insufficient-token':
          'Mint failed due to insufficient available {{token}}',
        limit: 'Mint failed due to the plot minting limit was exceeded today',
      },
      'incoming-mint':
        'Congrats! User {{username}} minted {{quantity}} *NFTs on your {{plot}}. You successfully got {{amount}} {{token}} as a reward!',
    },
    maintain: {
      success:
        'You successfully maintained the plot! The maintenance degree will increase by {{percent}}% with consumed {{amount}} ENGY',
      fail: {
        'insufficient-token':
          'Maintain failed due to insufficient available ENGY ',
      },
      'alert-low-maintainance':
        'Alert: If the plot plot maintenance bar is lower than 30%, it will be automatically recycled by the system. Please maintain your plot plot in time.',
    },
    'listing-plot': {
      success:
        'Congrats! You successfully listed {{plot}}, priced at {{amount}} {{token}}',
      cancel: 'Successfully cancel the listing of the plot',
      fail: {
        'day-limit':
          'Listing failed. Because it needs to be occupied by you over 5 days before it can be listed',
        'relisting-limit':
          'Listing failed. Because it has been less than 24 hours since the last delisting',
        expiration:
          'Listing failed. Because it was less than 24 hours before the expiration of the plot management right.',
      },
    },
    'buy-plot': {
      success:
        'Congrats! You successfully purchased it by consuming {{amount}} {{token}}. You can check it out at your Cell',
      fail: {
        'insufficient-token':
          'Purchase failed due to insufficient available {{token}}',
        'no-mints':
          'Purchase failed. Because you need to successfully mint an NFT on this plot before you can occupy or purchase it',
        taken: 'Purchase failed, and the plot has been purchased by others',
        limit:
          'Purchase failed due to the plot occupation limit being exceeded',
      },
      'info-plot-sold':
        'Congrats! Your listed {{plot}} successfully sold. You earned {{amount}} {{token}} from this deal!',
    },
    'lost-plot': {
      'warn-plot-lost':
        'You lost the {{plot}} due to poor management (the maintenance bar is under 30%).',
      'warn-plot-expired':
        'Your {{plot}} has expired and will be automatically reclaimed by the system.',
    },
    m2e: {
      done: 'Move-to-earn was on for {{duration}}, earned {{amount}} ENGY',
      'warn-m2e-interrupted': 'Alert: Your M2E process has been interrupted',
      'warn-suit-burn-out':
        'Your M2E process is terminated because your equipment lifespan ran out',
    },
    'buy-item': {
      success:
        'Congrats! You successfully purchased {{item}} by consuming {{amount}} {{token}}',
      fail: {
        'insufficient-token':
          'Purchase failed due to insufficient available {{token}}',
        'unfinished-payment':
          'Purchase failed and the payment was not completed',
        'sold-out': 'Purchase failed, this item is sold out',
      },
    },
  },
  page: {
    common: {
      followers: 'Followers',
      followings: 'Followings',
      'ranking-board': 'Ranking board',
      market: 'Market',
      confirm: 'Confirm',
      cancel: 'Cancel',
      producer: 'Producer',
      blazer: 'Blazer',
      maintain: 'Maintain',
      listing: 'Listing',
      ranking: 'Ranking',
      'the-end': 'The End',
      note: 'Note',
      name: 'Name',
      share: 'Share',
      done: 'Done',
      purchase: 'Purchase',
      more: 'More',
      buy: 'Buy',
      mint: 'Mint',
      'mint-counts': 'Mint Counts',
      views: 'Views',
      continent: 'Continent',
      results: 'Results',
      'listing-failed': 'Listing failed',
      'preemption-failed': 'Preemption failed',
      'purchase-failed': 'Purchase failed',
      'coming-soon': 'Coming Soon',
    },
    alpha: {
      m2ecard: {
        'current-m2e-duration': 'Current M2E Duration',
        'engy-generated': 'ENGY generated',
        'avatar-remaining-time': 'Avatar Remaining Time',
        'current-avatar-performance': 'Current Avatar Performance',
        off: 'Off',
      },
      plotcard: {
        occupy: 'Occupy',
        'mint/trial': 'Mint/Trial',
      },
    },
    blazer: {
      blazercard: {
        'please-add-a-plot': 'Please add a plot',
        level: 'Level',
        max: 'Max',
        pcs: 'pcs',
        "today's-mints": "Today's Mints",
        'current-limit': 'Current Limit',
        daily: 'Daily',
        durability: 'Durability',
        'cancel-listing': 'Cancel listing',
      },
      blazermanage: {
        property: 'Property',
      },
      listing: {
        'listing-the-plot': 'Listing the plot',
        'confirm-listing':
          'Do you confirm that this plot is listed for sale at the price of',
        'after-confirm': 'After confirmation, there will be a',
        'waiting-hour': '{{hour}}-hour',
        'cancel-right':
          'listing waiting time. During this period, you can go to the Plot Interface to cancel the transaction',
        'enter-the-listed-price-in-rosen': 'Enter the listed price in USDT',
        'remarks-there-will-be-a-12-hour-countdown-after-you-set-up-listing,-and-the-public-sale-will-start-after-the-countdown-ends.':
          'Remarks: There will be a 12-hour countdown after you set up listing, and the public sale will start after the countdown ends.',
      },
      plotmaintain: {
        'warning!-the-plot-will-be-revoked-when-its-durability-under-30%!':
          'Warning! The plot will be revoked when its durability under 30%!',
        maintaining: 'Maintaining',
        'input-enrg-amount-here': 'Input ENRG amount here',
        state: 'State',
        'if-the-durability-brought-by-input-enrg-amount-will-exceed-the-max-durability,-the-rest-of-enrg-will-be-returned-after-durability-reaches-100%':
          'If the durability brought by input ENRG amount will exceed the MAX durability, the rest of ENRG will be returned after durability reaches 100%',
        'buy-energy': 'Buy Energy',
        'current-engy-you-have': 'Current ENGY you have',
      },
    },
    mint: {
      avataredit: {
        'input-name': 'Input name',
      },
      friend: {
        'upload-pic': 'Upload pic',
        search: 'Search',
      },
      index: {
        'insert-your-thought': 'Insert your thought',
        yourself: 'Yourself',
        'longitude-&-latitude': 'longitude & latitude',
        'add-friend': 'Add friend',
        'ros/piece': 'ROS/piece',
        'token/piece': 'USDT/piece',
        'mint-price': 'Mint price',
        amount: 'Amount',
        quantity: 'Quantity',
        'trial(free)': 'Trial(free)',
      },
    },
    producer: {
      producermanage: {
        'current-using': 'Current using',
        status: 'Status',
        'earning-rate': 'Earning rate',
        on: 'On',
      },
    },
    search: {
      index: {
        plot: 'Plot',
        user: 'User',
      },
      plot: {
        'search-for-plot': 'Search for plot',
        europe: 'Europe',
        asia: 'Asia',
        oceania: 'Oceania',
        africa: 'Africa',
        'north-america': 'North America',
        'south-america': 'South America',
        antarctica: 'Antarctica',
        vacant: 'Vacant',
        'by-continent': 'by continent',
      },
      user: {
        'search-for-user': 'Search for user',
      },
    },
    dashboard: {
      alpha: 'Alpha',
      beta: 'Beta',
      cell: 'Cell',
      'ranking-board': 'Ranking board',
      market: 'Market',
    },
    loginsignup: {
      login: {
        'enter-your-phone-number-or-email-address': 'Enter your email address',
        password: 'Password',
        'consent-clause': 'Consent clause',
        'sign-in': 'Sign in',
        'sign-up': 'Sign up',
      },
      signup: {
        'enter-your-email-address': 'Enter your email address',
        'enter-verification-code': 'Enter verification code',
        password: 'Password',
        'confirm-your-password': 'Confirm your password',
      },
      verifycodebtn: {
        'send-code': 'Send code',
      },
    },
    market: {
      index: {
        'official-store': 'Official Store',
        'nft-store': 'NFT Store',
        'token-exchange': 'Token Exchange',
        'plot-trade': 'Plot Trade',
      },
      nftdetails: {
        item: 'Item',
        attribute: 'Attribute',
        'm2e-performance': 'M2E performance',
        'time-limit': 'Time limit',
      },
      exchange: {
        'enter-xxx-amount-you-want': 'Enter {{token}} amount you want',
        'current-exchange-rate-xxx': 'Current Exchange Rate {{tokenPairs}}',
        'expected-cost-xxx': 'Expected Cost {{token}}',
        'expected-output-xxx': 'Expected Output {{token}}',
        'exchange-fee': 'Exchange Fee',
        'a-small-exchange-fee-will-be-charged-when-you-exchange-rosen-using-engy':
          'a small exchange fee will be charged when you exchange USDT using ENGY',
        'you-may-also-find-that-the-expected-output-engy-does-not-match-the-output-you-want,-this-is-because-rosen-has-no-decimals.-you-can-only-cost-integer-amount-of-rosen-to-exchange-engy':
          'you may also find that the expected output ENGY does not match the output you want, this is because USDT has no decimals. You can only cost integer amount of USDT to exchange ENGY',
      },
      plotdetails: {
        'current-blazer': 'Current Blazer',
      },
    },
    rankingboard: {
      index: {
        'ranking-board': 'Ranking board',
        overall: 'Overall',
        monthly: 'Monthly',
        daily: 'Daily',
      },
    },
    personalcell: {
      assets: {
        'digital-assets': 'Digital Assets',
      },
      gallery: 'Gallery',
      'item-&-digital-assets': 'Item & Digital Assets',
      setting: 'Setting',
      wallet: 'Wallet',
      logout: 'Logout',
      settings: {
        'user-setting': 'User Setting',
        save: 'save',
        username: 'Username',
        'add-your-name': 'Add your name',
        bio: 'Bio',
        'add-a-bio-to-your-profile': 'Add a bio to your profile',
        phone: 'Phone',
        verify: 'Verify',
        'wallet-address': 'Wallet',
        connect: 'Connect',
        disconnect: 'Disconnect',
        'add-social-media-accounts': 'Add Social Media Accounts',
      },
      phoneverify: {
        'verify-your-phone': 'Verify Your Phone',
        'enter-your-phone-number': 'Enter your phone number',
        'enter-verification-code': 'Enter verification code',
        'consent-clause': 'Consent clause',
      },
      share: {
        to: 'To',
        'succesfully-sent!': 'Succesfully Sent!',
        gift: 'Gift',
      },
      walletexchange: {
        deposit: 'Deposit',
        withdraw: 'Withdraw',
      },
      walletverify: {
        'connet-your-wallet': 'Connet Your Wallet',
        none: 'None',
        'your-address-is': 'Your Address is ',
      },
    },
  },
}
