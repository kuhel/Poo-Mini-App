import React, { useState, Fragment } from 'react';
import Slider from '@vkontakte/vkui/dist/components/Slider/Slider';
import Header from '@vkontakte/vkui/dist/components/Header/Header';
import Button from '@vkontakte/vkui/dist/components/Button/Button';
import Group from '@vkontakte/vkui/dist/components/Group/Group';
import FixedLayout from '@vkontakte/vkui/dist/components/FixedLayout/FixedLayout';
import Avatar from '@vkontakte/vkui/dist/components/Avatar/Avatar';
import Div from '@vkontakte/vkui/dist/components/Div/Div';
import FormLayout from '@vkontakte/vkui/dist/components/FormLayout/FormLayout';
import Counter from '@vkontakte/vkui/dist/components/Counter/Counter';
import Snackbar from '@vkontakte/vkui/dist/components/Snackbar/Snackbar';
import Icon28DocumentOutline from '@vkontakte/icons/dist/28/document_outline';
import bridge from '@vkontakte/vk-bridge';
import roll from '../img/roll.svg';

const SHEETS_PER_ROLL 		= 160;
const SHEETS_PER_VISIT 		= 7;
const DEFAULT_ROLLS_COUNT 	= 4;
const DEFAULT_TOILET_VISITS = 3;
const DEFAULT_PERSONS_COUNT = 2;
const IS_TAPTIC_SUPPORTED	= bridge.supports('VKWebAppTapticNotificationOccurred');

function throttle(callback, delay) {
	let isThrottled = false, args, context;

	function wrapper() {
		if (isThrottled) {
			args = arguments;
			context = this;
			return;
		}

		isThrottled = true;
		callback.apply(this, arguments);
		
		setTimeout(() => {
			isThrottled = false;
			if (args) {
				wrapper.apply(context, args);
				args = context = null;
			}
		}, delay);
	}
	return wrapper;
}

const Home = ({ fetchedState, snackbarError }) => {
	const [rollsCount, setRollsCount] = useState(fetchedState.hasOwnProperty('rollsCount') ? fetchedState.rollsCount : DEFAULT_ROLLS_COUNT);
	const [toiletVisits, setToiletVisits] = useState(fetchedState.hasOwnProperty('toiletVisits') ? fetchedState.toiletVisits : DEFAULT_TOILET_VISITS);
	const [personsCount, setPersonsCount] = useState(fetchedState.hasOwnProperty('personsCount') ? fetchedState.personsCount : DEFAULT_PERSONS_COUNT);
	const [sheetsCount, setSheetsCount] = useState(fetchedState.hasOwnProperty('sheetsCount') ? fetchedState.sheetsCount : SHEETS_PER_ROLL * DEFAULT_ROLLS_COUNT);
	const [snackbar, setSnackbar] = useState(snackbarError);

	const onSheet = async function () {
		if (IS_TAPTIC_SUPPORTED) {
			await bridge.send('VKWebAppTapticNotificationOccurred', { type: sheetsCount <= 0 ? 'error' : 'success' });
		}
		if (sheetsCount <= 0) {
			setSnackbar(<Snackbar
				layout='vertical'
				onClose={() => setSnackbar(null)}
				before={<Avatar size={24} style={{backgroundColor: 'var(--accent)'}}><Icon28DocumentOutline fill='#fff' width={14} height={14} /></Avatar>}
				duration={900}
			>
				У вас не осталось туалетки
			</Snackbar>);
			setRollsCount(0);
			return;
		}
		const newSheetsCount = sheetsCount - 1;
		const newRollsCount = Math.floor(newSheetsCount / SHEETS_PER_ROLL);

		setSheetsCount(newSheetsCount);
		if (rollsCount !== newRollsCount && newRollsCount !== 0) {
			setRollsCount(newRollsCount);
		}
		setSnackbar(<Snackbar
			layout='vertical'
			onClose={() => setSnackbar(null)}
			before={<Avatar size={24} style={{backgroundColor: 'var(--accent)'}}><Icon28DocumentOutline fill='#fff' width={14} height={14} /></Avatar>}
			duration={900}
		>
			{newSheetsCount <= 0 ? 'У вас не осталось туалетки' : `Листочек туалетки потрачен, осталось ${newSheetsCount}`}
		</Snackbar>);
		setStorage({
			sheetsCount: newSheetsCount
		});
	}

	const setStorage = async function(properties) {
		await bridge.send('VKWebAppStorageSet', {
			key: 'state',
			value: JSON.stringify({
				rollsCount,
				toiletVisits,
				personsCount,
				sheetsCount,
				...properties
			})
		});
	}

	const countDays = function() {
		const sheetsPerDay = SHEETS_PER_VISIT * toiletVisits * personsCount;
		const totalSheets = rollsCount * SHEETS_PER_ROLL
		return Math.round(totalSheets / sheetsPerDay);
	}

	const onRollsChange = throttle(rolls => {
		if (rolls === rollsCount) return;
		setSheetsCount(sheetsCount + (rolls - rollsCount) * SHEETS_PER_ROLL);
		setRollsCount(rolls);
		setStorage();
	}, 200);

	const onVisitsChange = throttle(visits => {
		if (visits === toiletVisits) return;
		setToiletVisits(visits)
		setStorage();
	}, 200);

	const onPersonsChange = throttle(persons => {
		if (persons === personsCount) return;
		setPersonsCount(persons);
		setStorage();
	}, 200);

	return (
		<Fragment>
			<Group>
				<h1 className='DaysLeftHeading'>{countDays()}</h1>
				<h3 className='DaysLeftSubheading'>Столько дней вы продержитесь</h3>
			</Group>
			<FormLayout>
					<Slider
						step={1}
						min={0}
						max={48}
						value={rollsCount}
						top={
							<Header indicator={<Counter size='m' mode='primary'>{rollsCount}</Counter>}>
								<span role='img' aria-label='Toilet paper'>🧻</span> Количество рулонов
							</Header>
						}
						onChange={(rolls) => onRollsChange(rolls)}
					/>
					<Slider
						step={1}
						min={1}
						max={8}
						value={toiletVisits}
						top={
							<Header indicator={<Counter size='m' mode='primary'>{toiletVisits}</Counter>}>
								<span role='img' aria-label='Poo'>💩</span> Посещений туалета в день
							</Header>
						}
						onChange={visits => onVisitsChange(visits)}
					/>
					<Slider
						step={1}
						min={1}
						max={16}
						value={personsCount}
						top={
							<Header indicator={<Counter size='m' mode='primary'>{personsCount}</Counter>}>
								<span role='img' aria-label='People in household'>👨‍👩‍👧‍👦</span> Людей дома
							</Header>
						}
						onChange={persons => onPersonsChange(persons)}
					/>
			</FormLayout>

			<FixedLayout vertical="bottom">
				<Div className='PooBtnContainer'>
					<Button  className='PooBtn' size='xl' onClick={onSheet}>
						<img src={roll} alt="Toilet paper roll"/>
					</Button>
				</Div>
			</FixedLayout>

			{snackbar}
		</Fragment>
	);
};

export default Home;
