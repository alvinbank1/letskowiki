/* global fetchMock */
const restSearchClient = require( '../../resources/skins.vector.search/restSearchClient.js' );
const jestFetchMock = require( 'jest-fetch-mock' );

const mockedRequests = !process.env.TEST_LIVE_REQUESTS;
const configMock = {
	get: jest.fn().mockImplementation( key => {
		if ( key === 'wgScriptPath' ) {
			return '/w';
		}
		return null;
	} ),
	set: jest.fn()
};

describe( 'restApiSearchClient', () => {
	beforeAll( () => {
		jestFetchMock.enableFetchMocks();
	} );

	afterAll( () => {
		jestFetchMock.disableFetchMocks();
	} );

	beforeEach( () => {
		fetchMock.resetMocks();
		if ( !mockedRequests ) {
			fetchMock.disableMocks();
		}
	} );

	test( '2 results', async () => {
		const thumbUrl = '//upload.wikimedia.org/wikipedia/commons/0/01/MediaWiki-smaller-logo.png';
		const restResponse = {
			pages: [
				{
					id: 37298,
					key: 'Media',
					title: 'Media',
					description: 'Wikimedia disambiguation page',
					thumbnail: null
				},
				{
					id: 323710,
					key: 'MediaWiki',
					title: 'MediaWiki',
					description: 'wiki software',
					thumbnail: {
						width: 200,
						height: 189,
						url: thumbUrl
					}
				}
			]
		};
		fetchMock.mockOnce( JSON.stringify( restResponse ) );

		const searchResult = await restSearchClient( configMock ).fetchByTitle(
			'media',
			'en.wikipedia.org',
			2
		).fetch;

		/* eslint-disable-next-line compat/compat */
		const controller = new AbortController();

		expect( searchResult.query ).toStrictEqual( 'media' );
		expect( searchResult.results ).toBeTruthy();
		expect( searchResult.results.length ).toBe( 2 );

		expect( searchResult.results[ 0 ] ).toStrictEqual(
			Object.assign( {}, restResponse.pages[ 0 ], {
				// thumbnail: null -> thumbnail: undefined
				thumbnail: undefined
			} ) );
		expect( searchResult.results[ 1 ] ).toStrictEqual( restResponse.pages[ 1 ] );

		if ( mockedRequests ) {
			expect( fetchMock ).toHaveBeenCalledTimes( 1 );
			expect( fetchMock ).toHaveBeenCalledWith(
				'//en.wikipedia.org/w/rest.php/v1/search/title?q=media&limit=2',
				{ headers: { accept: 'application/json' }, signal: controller.signal }
			);
		}
	} );

	test( '0 results', async () => {
		const restResponse = { pages: [] };
		fetchMock.mockOnce( JSON.stringify( restResponse ) );

		const searchResult = await restSearchClient( configMock ).fetchByTitle(
			'thereIsNothingLikeThis',
			'en.wikipedia.org'
		).fetch;

		/* eslint-disable-next-line compat/compat */
		const controller = new AbortController();
		expect( searchResult.query ).toStrictEqual( 'thereIsNothingLikeThis' );
		expect( searchResult.results ).toBeTruthy();
		expect( searchResult.results.length ).toBe( 0 );

		if ( mockedRequests ) {
			expect( fetchMock ).toHaveBeenCalledTimes( 1 );
			expect( fetchMock ).toHaveBeenCalledWith(
				'//en.wikipedia.org/w/rest.php/v1/search/title?q=thereIsNothingLikeThis&limit=10',
				{ headers: { accept: 'application/json' }, signal: controller.signal }
			);
		}
	} );

	if ( mockedRequests ) {
		test( 'network error', async () => {
			fetchMock.mockRejectOnce( new Error( 'failed' ) );

			await expect( restSearchClient( configMock ).fetchByTitle(
				'anything',
				'en.wikipedia.org'
			).fetch ).rejects.toThrow( 'failed' );
		} );
	}
} );
