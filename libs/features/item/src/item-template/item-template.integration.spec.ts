import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ITEM_SUBCLASS, ItemTemplate, Lock } from '@keira/shared/acore-world-model';
import { KEIRA_APP_CONFIG_TOKEN, KEIRA_MOCK_CONFIG } from '@keira/shared/config';
import { MysqlQueryService, SqliteQueryService, SqliteService } from '@keira/shared/db-layer';
import { EditorPageObject, TranslateTestingModule } from '@keira/shared/test-utils';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrModule } from 'ngx-toastr';
import { lastValueFrom, of } from 'rxjs';
import { instance, mock } from 'ts-mockito';
import { ItemHandlerService } from '../item-handler.service';
import { ItemTemplateComponent } from './item-template.component';

class ItemTemplatePage extends EditorPageObject<ItemTemplateComponent> {
  get itemStats(): HTMLDivElement {
    return this.query<HTMLDivElement>('.item-stats');
  }
}

describe('ItemTemplate integration tests', () => {
  const id = 1234;
  const expectedFullCreateQuery =
    'DELETE FROM `item_template` WHERE (`entry` = 1234);\n' +
    'INSERT INTO `item_template` (`entry`, `class`, `subclass`, `SoundOverrideSubclass`, `name`, `displayid`, `Quality`, ' +
    '`Flags`, `FlagsExtra`, `BuyCount`, `BuyPrice`, `SellPrice`, `InventoryType`, `AllowableClass`, `AllowableRace`, ' +
    '`ItemLevel`, `RequiredLevel`, `RequiredSkill`, `RequiredSkillRank`, `requiredspell`, `requiredhonorrank`, ' +
    '`RequiredCityRank`, `RequiredReputationFaction`, `RequiredReputationRank`, `maxcount`, `stackable`, `ContainerSlots`, ' +
    '`StatsCount`, `stat_type1`, `stat_value1`, `stat_type2`, `stat_value2`, `stat_type3`, `stat_value3`, ' +
    '`stat_type4`, `stat_value4`, `stat_type5`, `stat_value5`, `stat_type6`, `stat_value6`, `stat_type7`, `stat_value7`, ' +
    '`stat_type8`, `stat_value8`, `stat_type9`, `stat_value9`, `stat_type10`, `stat_value10`, `ScalingStatDistribution`, ' +
    '`ScalingStatValue`, `dmg_min1`, `dmg_max1`, `dmg_type1`, `dmg_min2`, `dmg_max2`, `dmg_type2`, `armor`, `holy_res`, ' +
    '`fire_res`, `nature_res`, `frost_res`, `shadow_res`, `arcane_res`, `delay`, `ammo_type`, `RangedModRange`, `spellid_1`, ' +
    '`spelltrigger_1`, `spellcharges_1`, `spellppmRate_1`, `spellcooldown_1`, `spellcategory_1`, `spellcategorycooldown_1`, ' +
    '`spellid_2`, `spelltrigger_2`, `spellcharges_2`, `spellppmRate_2`, `spellcooldown_2`, `spellcategory_2`, ' +
    '`spellcategorycooldown_2`, `spellid_3`, `spelltrigger_3`, `spellcharges_3`, `spellppmRate_3`, `spellcooldown_3`, ' +
    '`spellcategory_3`, `spellcategorycooldown_3`, `spellid_4`, `spelltrigger_4`, `spellcharges_4`, `spellppmRate_4`, ' +
    '`spellcooldown_4`, `spellcategory_4`, `spellcategorycooldown_4`, `spellid_5`, `spelltrigger_5`, `spellcharges_5`, ' +
    '`spellppmRate_5`, `spellcooldown_5`, `spellcategory_5`, `spellcategorycooldown_5`, `bonding`, `description`, `PageText`, ' +
    '`LanguageID`, `PageMaterial`, `startquest`, `lockid`, `Material`, `sheath`, `RandomProperty`, `RandomSuffix`, `block`, ' +
    '`itemset`, `MaxDurability`, `area`, `Map`, `BagFamily`, `TotemCategory`, `socketColor_1`, `socketContent_1`, `socketColor_2`, ' +
    '`socketContent_2`, `socketColor_3`, `socketContent_3`, `socketBonus`, `GemProperties`, `RequiredDisenchantSkill`, ' +
    '`ArmorDamageModifier`, `duration`, `ItemLimitCategory`, `HolidayId`, `ScriptName`, `DisenchantID`, `FoodType`, ' +
    '`minMoneyLoot`, `maxMoneyLoot`, `flagsCustom`, `VerifiedBuild`) VALUES\n' +
    "(1234, 0, 0, -1, '', 0, 0, 0, 0, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, " +
    '0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000, 0, 0, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, -1, ' +
    "0, -1, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, -1, 0, -1, 0, '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, " +
    "0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, '', 0, 0, 0, 0, 0, 0);\n";

  const originalEntity = new ItemTemplate();
  originalEntity.entry = id;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ToastrModule.forRoot(), ModalModule.forRoot(), ItemTemplateComponent, RouterTestingModule, TranslateTestingModule],
      providers: [
        { provide: KEIRA_APP_CONFIG_TOKEN, useValue: KEIRA_MOCK_CONFIG },
        ItemHandlerService,
        { provide: SqliteService, useValue: instance(mock(SqliteService)) },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  }));

  const mockItemNameById = 'mockItemNameById';
  const mockGetSpellNameById = 'mockGetSpellNameById';
  const mockGetSpellDescriptionById = 'mockGetSpellDescriptionById';
  const mockGetFactionNameById = 'mockGetFactionNameById';
  const mockGetMapNameById = 'mockGetMapNameById';
  const mockGetAreaNameById = 'mockGetAreaNameById';
  const mockGetEventNameByHolidayId = 'mockGetEventNameByHolidayId';
  const mockGetSocketBonusById = 'mockgetFactionNameByIdGetSocketBonusById';

  const lockData: Lock = {
    id: 1,
    type1: 1,
    type2: 1,
    type3: 2,
    type4: 2,
    type5: 0,
    properties1: 1,
    properties2: 0,
    properties3: 1,
    properties4: 0,
    properties5: 0,
    reqSkill1: 0,
    reqSkill2: 0,
    reqSkill3: 1,
    reqSkill4: 0,
    reqSkill5: 0,
  };

  function setup(creatingNew: boolean) {
    const handlerService = TestBed.inject(ItemHandlerService);
    handlerService['_selected'] = `${id}`;
    handlerService.isNew = creatingNew;

    const queryService = TestBed.inject(MysqlQueryService);
    const querySpy = spyOn(queryService, 'query').and.returnValue(of([]));

    spyOn(queryService, 'selectAll').and.returnValue(of(creatingNew ? [] : [originalEntity]));

    const fixture = TestBed.createComponent(ItemTemplateComponent);
    const component = fixture.componentInstance;
    const page = new ItemTemplatePage(fixture);
    fixture.autoDetectChanges(true);
    fixture.detectChanges();

    const mysqlQueryService = TestBed.inject(MysqlQueryService);
    spyOn(mysqlQueryService, 'getItemNameById').and.callFake(() => lastValueFrom(of(mockItemNameById)));
    spyOn(mysqlQueryService, 'queryValue').and.callFake(() => of([234] as any));

    const sqliteQueryService = TestBed.inject(SqliteQueryService);
    spyOn(sqliteQueryService, 'getSpellNameById').and.callFake((i) => lastValueFrom(of(mockGetSpellNameById + i)));
    spyOn(sqliteQueryService, 'getSpellDescriptionById').and.callFake((i) => lastValueFrom(of(mockGetSpellDescriptionById + i)));
    spyOn(sqliteQueryService, 'getFactionNameById').and.callFake((i) => lastValueFrom(of(mockGetFactionNameById + i)));
    spyOn(sqliteQueryService, 'getMapNameById').and.callFake((i) => lastValueFrom(of(mockGetMapNameById + i)));
    spyOn(sqliteQueryService, 'getAreaNameById').and.callFake((i) => lastValueFrom(of(mockGetAreaNameById + i)));
    spyOn(sqliteQueryService, 'getEventNameByHolidayId').and.callFake((i) => lastValueFrom(of(mockGetEventNameByHolidayId + i)));
    spyOn(sqliteQueryService, 'getSocketBonusById').and.callFake((i) => lastValueFrom(of(mockGetSocketBonusById + i)));
    spyOn(sqliteQueryService, 'getLockById').and.callFake(() => lastValueFrom(of([lockData])));
    spyOn(sqliteQueryService, 'getSkillNameById').and.callFake(() => lastValueFrom(of('profession')));
    spyOn(sqliteQueryService, 'getIconByItemDisplayId').and.callFake(() => of('inv_axe_60'));
    spyOn(sqliteQueryService, 'queryValue').and.callFake(() => of('inv_axe_60' as any));
    spyOn(sqliteQueryService, 'query').and.callFake(() => of([{ name: 'test' }] as any));

    return { handlerService, queryService, querySpy, fixture, component, page, mysqlQueryService, sqliteQueryService };
  }

  describe('Creating new', () => {
    it('should correctly initialise', () => {
      const { page } = setup(true);
      page.expectQuerySwitchToBeHidden();
      page.expectFullQueryToBeShown();
      page.expectFullQueryToContain(expectedFullCreateQuery);
    });

    it('should correctly update the unsaved status', () => {
      const { page, handlerService } = setup(true);
      const field = 'Quality';
      expect(handlerService.isItemTemplateUnsaved).toBe(false);
      page.setInputValueById(field, 3);
      expect(handlerService.isItemTemplateUnsaved).toBe(true);
      page.setInputValueById(field, 0);
      expect(handlerService.isItemTemplateUnsaved).toBe(false);
    });

    it('changing a property and executing the query should correctly work', () => {
      const { page, querySpy } = setup(true);
      querySpy.calls.reset();

      page.setInputValueById('name', 'Shin');
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('Shin');

      page.clickExecuteQuery();

      expect(querySpy).toHaveBeenCalledTimes(1);
      expect(querySpy.calls.mostRecent().args[0]).toContain('Shin');
    });
  });

  describe('Editing existing', () => {
    it('should correctly initialise', () => {
      const { page } = setup(false);
      page.expectDiffQueryToBeShown();
      page.expectDiffQueryToBeEmpty();
      page.expectFullQueryToContain(expectedFullCreateQuery);
    });

    it('changing all properties and executing the query should correctly work', () => {
      const { page, querySpy } = setup(false);
      const expectedQuery =
        'UPDATE `item_template` SET ' +
        "`subclass` = 1, `SoundOverrideSubclass` = 2, `name` = '3', `displayid` = 4, `Quality` = 5, `Flags` = 6, `FlagsExtra` = 7, " +
        '`BuyCount` = 8, `BuyPrice` = 9, `SellPrice` = 10, `InventoryType` = 11, `AllowableClass` = 12, `AllowableRace` = 13, ' +
        '`ItemLevel` = 14, `RequiredLevel` = 15, `RequiredSkill` = 16, `RequiredSkillRank` = 17, `requiredspell` = 18, ' +
        '`requiredhonorrank` = 19, `RequiredCityRank` = 20, `RequiredReputationFaction` = 21, `RequiredReputationRank` = 22, ' +
        '`maxcount` = 23, `stackable` = 24, `ContainerSlots` = 25, `StatsCount` = 10, `stat_type1` = 27, `stat_value1` = 28, ' +
        '`stat_type2` = 29, `stat_value2` = 30, `stat_type3` = 31, `stat_value3` = 32, `stat_type4` = 33, `stat_value4` = 34, ' +
        '`stat_type5` = 35, `stat_value5` = 36, `stat_type6` = 37, `stat_value6` = 38, `stat_type7` = 39, `stat_value7` = 40, ' +
        '`stat_type8` = 41, `stat_value8` = 42, `stat_type9` = 43, `stat_value9` = 44, `stat_type10` = 45, `stat_value10` = 46, ' +
        '`ScalingStatDistribution` = 47, `ScalingStatValue` = 48, `dmg_min1` = 49, `dmg_max1` = 50, `dmg_type1` = 51, ' +
        '`dmg_min2` = 52, `dmg_max2` = 53, `dmg_type2` = 54, `armor` = 55, `holy_res` = 56, `fire_res` = 57, `nature_res` = 58, ' +
        '`frost_res` = 59, `shadow_res` = 60, `arcane_res` = 61, `delay` = 62, `ammo_type` = 63, `RangedModRange` = 64, ' +
        '`spellid_1` = 65, `spelltrigger_1` = 1, `spellcharges_1` = 66, `spellppmRate_1` = 67, `spellcooldown_1` = 68, ' +
        '`spellcategory_1` = 69, `spellcategorycooldown_1` = 70, `spellid_2` = 71, `spelltrigger_2` = 2, `spellcharges_2` = 72, ' +
        '`spellppmRate_2` = 73, `spellcooldown_2` = 74, `spellcategory_2` = 75, `spellcategorycooldown_2` = 76, `spellid_3` = 77, ' +
        '`spelltrigger_3` = 4, `spellcharges_3` = 78, `spellppmRate_3` = 79, `spellcooldown_3` = 80, `spellcategory_3` = 81, ' +
        '`spellcategorycooldown_3` = 82, `spellid_4` = 83, `spelltrigger_4` = 5, `spellcharges_4` = 84, `spellppmRate_4` = 85, ' +
        '`spellcooldown_4` = 86, `spellcategory_4` = 87, `spellcategorycooldown_4` = 88, `spellid_5` = 89, `spelltrigger_5` = 6, ' +
        '`spellcharges_5` = 90, `spellppmRate_5` = 91, `spellcooldown_5` = 92, `spellcategory_5` = 93, ' +
        "`spellcategorycooldown_5` = 94, `bonding` = 95, `description` = '96', `PageText` = 97, `LanguageID` = 98, " +
        '`PageMaterial` = 99, `startquest` = 100, `lockid` = 101, `Material` = 102, `sheath` = 103, `RandomProperty` = 104, ' +
        '`RandomSuffix` = 105, `block` = 106, `itemset` = 107, `MaxDurability` = 108, `area` = 109, `Map` = 110, `BagFamily` = 111, ' +
        '`TotemCategory` = 112, `socketColor_1` = 113, `socketContent_1` = 114, `socketColor_2` = 115, `socketContent_2` = 116, ' +
        '`socketColor_3` = 117, `socketContent_3` = 118, `socketBonus` = 119, `GemProperties` = 120, `RequiredDisenchantSkill` = 121, ' +
        "`ArmorDamageModifier` = 122, `duration` = 123, `ItemLimitCategory` = 124, `HolidayId` = 125, `ScriptName` = '126', " +
        '`DisenchantID` = 127, `FoodType` = 128, `minMoneyLoot` = 129, `maxMoneyLoot` = 130, `flagsCustom` = 131 WHERE (`entry` = 1234);';

      const spelltriggers = {
        spelltrigger_1: 1,
        spelltrigger_2: 2,
        spelltrigger_3: 4,
        spelltrigger_4: 5,
        spelltrigger_5: 6,
      };

      querySpy.calls.reset();

      page.changeAllFields(originalEntity, [...Object.keys(spelltriggers), 'VerifiedBuild']);

      page.setSelectValueById('spelltrigger_1', spelltriggers.spelltrigger_1);
      page.setSelectValueById('spelltrigger_2', spelltriggers.spelltrigger_2);
      page.setSelectValueById('spelltrigger_3', spelltriggers.spelltrigger_3);
      page.setSelectValueById('spelltrigger_4', spelltriggers.spelltrigger_4);
      page.setSelectValueById('spelltrigger_5', spelltriggers.spelltrigger_5);

      page.expectDiffQueryToContain(expectedQuery);

      page.clickExecuteQuery();
      expect(querySpy).toHaveBeenCalledTimes(2);
      expect(querySpy.calls.mostRecent().args[0]).toContain(expectedQuery);
    });

    it('changing values should correctly update the queries', () => {
      const { page } = setup(false);
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary

      page.setInputValueById('name', 'Shin');
      page.expectDiffQueryToContain("UPDATE `item_template` SET `name` = 'Shin' WHERE (`entry` = 1234);");
      page.expectFullQueryToContain('Shin');

      page.setInputValueById('BuyCount', 22);
      page.expectDiffQueryToContain("UPDATE `item_template` SET `name` = 'Shin', `BuyCount` = 22 WHERE (`entry` = 1234);");
      page.expectFullQueryToContain('Shin');
      page.expectFullQueryToContain('22');
    });

    xit('changing a value via FlagsSelector should correctly work', waitForAsync(async () => {
      const { page } = setup(false);
      const field = 'Flags';
      page.clickElement(page.getSelectorBtn(field));

      await page.whenReady();
      page.expectModalDisplayed();

      page.toggleFlagInRowExternal(2);
      await page.whenReady();
      page.toggleFlagInRowExternal(12);
      await page.whenReady();
      page.clickModalSelect();
      await page.whenReady();

      expect(page.getInputById(field).value).toEqual('4100');
      page.expectDiffQueryToContain('UPDATE `item_template` SET `Flags` = 4100 WHERE (`entry` = 1234);');

      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('4100');
    }));

    xit('changing a value via ItemEnchantmentSelector should correctly work', waitForAsync(async () => {
      const { page, fixture } = setup(false);
      const field = 'socketBonus';
      const sqliteQueryService = TestBed.inject(SqliteQueryService);
      spyOn(sqliteQueryService, 'query').and.returnValue(of([{ id: 1248, name: 'Mock Enchantment', conditionId: 456 }]));

      page.clickElement(page.getSelectorBtn(field));
      await page.whenReady();
      page.expectModalDisplayed();

      page.clickSearchBtn();
      await fixture.whenStable();
      page.clickRowOfDatatableInModal(0);
      await page.whenReady();
      page.clickModalSelect();
      await page.whenReady();

      page.expectDiffQueryToContain('UPDATE `item_template` SET `socketBonus` = 1248 WHERE (`entry` = 1234);');
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('1248');
    }));

    xit('changing a value via HolidaySelector should correctly work', waitForAsync(async () => {
      const { page, fixture } = setup(false);
      const field = 'HolidayId';
      const sqliteQueryService = TestBed.inject(SqliteQueryService);
      spyOn(sqliteQueryService, 'query').and.returnValue(of([{ id: 1248, name: 'Mock Holiday' }]));

      page.clickElement(page.getSelectorBtn(field));
      await page.whenReady();
      page.expectModalDisplayed();

      page.clickSearchBtn();
      await fixture.whenStable();
      page.clickRowOfDatatableInModal(0);
      await page.whenReady();
      page.clickModalSelect();
      await page.whenReady();

      page.expectDiffQueryToContain('UPDATE `item_template` SET `HolidayId` = 1248 WHERE (`entry` = 1234);');
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('1248');
    }));

    xit('changing a value via ItemLimitCategorySelector should correctly work', waitForAsync(async () => {
      const { page, fixture } = setup(false);
      const field = 'ItemLimitCategory';
      const sqliteQueryService = TestBed.inject(SqliteQueryService);
      spyOn(sqliteQueryService, 'query').and.returnValue(of([{ id: 1248, name: 'Mock ItemLimitCategory', count: 2, isGem: 1 }]));

      page.clickElement(page.getSelectorBtn(field));
      await page.whenReady();
      page.expectModalDisplayed();

      page.clickSearchBtn();
      await fixture.whenStable();
      page.clickRowOfDatatableInModal(0);
      await page.whenReady();
      page.clickModalSelect();
      await page.whenReady();

      page.expectDiffQueryToContain('UPDATE `item_template` SET `ItemLimitCategory` = 1248 WHERE (`entry` = 1234);');
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('1248');
    }));

    xit('changing a value via LanguageSelector should correctly work', waitForAsync(async () => {
      const { page, fixture } = setup(false);
      const field = 'LanguageID';
      const sqliteQueryService = TestBed.inject(SqliteQueryService);
      spyOn(sqliteQueryService, 'query').and.returnValue(of([{ id: 1248, name: 'Mock LanguageID' }]));

      page.clickElement(page.getSelectorBtn(field));
      await page.whenReady();
      page.expectModalDisplayed();

      page.clickSearchBtn();
      await fixture.whenStable();
      page.clickRowOfDatatableInModal(0);
      await page.whenReady();
      page.clickModalSelect();
      await page.whenReady();

      page.expectDiffQueryToContain('UPDATE `item_template` SET `LanguageID` = 1248 WHERE (`entry` = 1234);');
      // Note: full query check has been shortened here because the table is too big, don't do this in other tests unless necessary
      page.expectFullQueryToContain('1248');
    }));

    describe('the subclass field', () => {
      it('should show the selector button only if class has a valid value', () => {
        const { page } = setup(false);
        page.setInputValueById('class', 100);
        expect(page.getSelectorBtn('subclass', false)).toBeFalsy();

        page.setInputValueById('class', 0);
        expect(page.getSelectorBtn('subclass', false)).toBeTruthy();

        page.setInputValueById('class', -1);
        expect(page.getSelectorBtn('subclass', false)).toBeFalsy();

        page.setInputValueById('class', 10);
        expect(page.getSelectorBtn('subclass', false)).toBeTruthy();

        page.setInputValueById('class', null as any);
        expect(page.getSelectorBtn('subclass', false)).toBeFalsy();
      });

      it('should show its values according to the value of class', () => {
        const { page } = setup(false);
        page.setInputValueById('class', 3);
        page.clickElement(page.getSelectorBtn('subclass'));

        expect(page.getCellOfDatatableInModal(2, 1).innerText).toContain(ITEM_SUBCLASS[3][2].name);
        page.clickModalSelect();
      });
    });

    describe('item stats count', () => {
      it('calculate item stats count automatically editing stats value fields', () => {
        const { page } = setup(false);

        expect(page.getInputById('StatsCount').value).toEqual('0');

        page.setInputValueById('stat_value1', 1);
        page.setInputValueById('stat_value2', 2);
        page.detectChanges();

        expect(page.getInputById('StatsCount').value).toEqual('2');

        page.setInputValueById('stat_value3', -1);
        page.detectChanges();

        expect(page.getInputById('StatsCount').value).toEqual('3');

        page.setInputValueById('stat_value2', 0);
        page.detectChanges();

        expect(page.getInputById('StatsCount').value).toEqual('2');
      });
    });

    describe('item preview', () => {
      it('all fields', fakeAsync(() => {
        const { page, fixture } = setup(false);
        page.setInputValueById('class', 1);
        page.setInputValueById('subclass', 2);
        page.setInputValueById('SoundOverrideSubclass', 3);
        page.setInputValueById('name', 'Helias item');
        page.setInputValueById('displayid', 4);
        page.setInputValueById('Quality', 5);
        page.setInputValueById('Flags', 6);
        page.setInputValueById('FlagsExtra', 7);
        page.setInputValueById('BuyCount', 8);
        page.setInputValueById('BuyPrice', 9);
        page.setInputValueById('SellPrice', 10);
        page.setInputValueById('InventoryType', 3);
        page.setInputValueById('AllowableClass', 11);
        page.setInputValueById('AllowableRace', 2);
        page.setInputValueById('ItemLevel', 123);
        page.setInputValueById('RequiredLevel', 123);
        page.setInputValueById('RequiredSkill', 755);
        page.setInputValueById('RequiredSkillRank', 123);
        page.setInputValueById('requiredspell', 123);
        page.setInputValueById('requiredhonorrank', 123);
        page.setInputValueById('RequiredCityRank', 123);
        page.setInputValueById('RequiredReputationFaction', 123);
        page.setInputValueById('RequiredReputationRank', 1);
        page.setInputValueById('maxcount', 123);
        page.setInputValueById('stackable', 123);
        page.setInputValueById('ContainerSlots', 123);
        page.setInputValueById('StatsCount', 123);
        page.setInputValueById('stat_type1', 123);
        page.setInputValueById('stat_value1', 123);
        page.setInputValueById('stat_type2', 123);
        page.setInputValueById('stat_value2', 123);
        page.setInputValueById('stat_type3', 123);
        page.setInputValueById('stat_value3', 123);
        page.setInputValueById('stat_type4', 123);
        page.setInputValueById('stat_value4', 123);
        page.setInputValueById('stat_type5', 123);
        page.setInputValueById('stat_value5', 123);
        page.setInputValueById('stat_type6', 123);
        page.setInputValueById('stat_value6', 123);
        page.setInputValueById('stat_type7', 123);
        page.setInputValueById('stat_value7', 123);
        page.setInputValueById('stat_type8', 123);
        page.setInputValueById('stat_value8', 123);
        page.setInputValueById('stat_type9', 123);
        page.setInputValueById('stat_value9', 123);
        page.setInputValueById('stat_type10', 123);
        page.setInputValueById('stat_value10', 123);
        page.setInputValueById('ScalingStatDistribution', 123);
        page.setInputValueById('ScalingStatValue', 123);
        page.setInputValueById('dmg_min1', 123);
        page.setInputValueById('dmg_max1', 125);
        page.setInputValueById('dmg_type1', 123);
        page.setInputValueById('dmg_min2', 124);
        page.setInputValueById('dmg_max2', 126);
        page.setInputValueById('dmg_type2', 123);
        page.setInputValueById('armor', 123);
        page.setInputValueById('holy_res', 123);
        page.setInputValueById('fire_res', 123);
        page.setInputValueById('nature_res', 123);
        page.setInputValueById('frost_res', 123);
        page.setInputValueById('shadow_res', 123);
        page.setInputValueById('arcane_res', 123);
        page.setInputValueById('delay', 123);
        page.setInputValueById('ammo_type', 123);
        page.setInputValueById('RangedModRange', 123);
        page.setInputValueById('spellid_1', 123);
        page.setSelectValueById('spelltrigger_1', 1);
        page.setInputValueById('spellcharges_1', 123);
        page.setInputValueById('spellppmRate_1', 123);
        page.setInputValueById('spellcooldown_1', 123);
        page.setInputValueById('spellcategory_1', 123);
        page.setInputValueById('spellcategorycooldown_1', 123);
        page.setInputValueById('spellid_2', 123);
        page.setSelectValueById('spelltrigger_2', 2);
        page.setInputValueById('spellcharges_2', 123);
        page.setInputValueById('spellppmRate_2', 123);
        page.setInputValueById('spellcooldown_2', 123);
        page.setInputValueById('spellcategory_2', 123);
        page.setInputValueById('spellcategorycooldown_2', 123);
        page.setInputValueById('spellid_3', 123);
        page.setSelectValueById('spelltrigger_3', 3);
        page.setInputValueById('spellcharges_3', 123);
        page.setInputValueById('spellppmRate_3', 123);
        page.setInputValueById('spellcooldown_3', 123);
        page.setInputValueById('spellcategory_3', 123);
        page.setInputValueById('spellcategorycooldown_3', 123);
        page.setInputValueById('spellid_4', 123);
        page.setSelectValueById('spelltrigger_4', 4);
        page.setInputValueById('spellcharges_4', 123);
        page.setInputValueById('spellppmRate_4', 123);
        page.setInputValueById('spellcooldown_4', 123);
        page.setInputValueById('spellcategory_4', 123);
        page.setInputValueById('spellcategorycooldown_4', 123);
        page.setInputValueById('spellid_5', 123);
        page.setSelectValueById('spelltrigger_5', 5);
        page.setInputValueById('spellcharges_5', 123);
        page.setInputValueById('spellppmRate_5', 123);
        page.setInputValueById('spellcooldown_5', 123);
        page.setInputValueById('spellcategory_5', 123);
        page.setInputValueById('spellcategorycooldown_5', 123);
        page.setInputValueById('bonding', 123);
        page.setInputValueById('description', 123);
        page.setInputValueById('PageText', 123);
        page.setInputValueById('LanguageID', 123);
        page.setInputValueById('PageMaterial', 123);
        page.setInputValueById('startquest', 123);
        page.setInputValueById('lockid', 123);
        page.setInputValueById('Material', 123);
        page.setInputValueById('sheath', 123);
        page.setInputValueById('RandomProperty', 123);
        page.setInputValueById('RandomSuffix', 123);
        page.setInputValueById('block', 123);
        page.setInputValueById('itemset', 123);
        page.setInputValueById('MaxDurability', 123);
        page.setInputValueById('area', 123);
        page.setInputValueById('Map', 123);
        page.setInputValueById('BagFamily', 123);
        page.setInputValueById('TotemCategory', 123);
        page.setInputValueById('socketColor_1', 123);
        page.setInputValueById('socketContent_1', 123);
        page.setInputValueById('socketColor_2', 123);
        page.setInputValueById('socketContent_2', 123);
        page.setInputValueById('socketColor_3', 123);
        page.setInputValueById('socketContent_3', 123);
        page.setInputValueById('socketBonus', 123);
        page.setInputValueById('GemProperties', 123);
        page.setInputValueById('RequiredDisenchantSkill', 123);
        page.setInputValueById('ArmorDamageModifier', 123);
        page.setInputValueById('duration', 123);
        page.setInputValueById('ItemLimitCategory', 123);
        page.setInputValueById('HolidayId', 123);
        page.setInputValueById('ScriptName', 123);
        page.setInputValueById('DisenchantID', 123);
        page.setInputValueById('FoodType', 123);
        page.setInputValueById('minMoneyLoot', 123);
        page.setInputValueById('maxMoneyLoot', 123);
        page.setInputValueById('flagsCustom', 123);

        tick(700);

        fixture.whenStable().then(() => {
          const itemStats = page.itemStats.innerText;
          expect(itemStats).toContain('Helias item');
          expect(itemStats).toContain('mockGetMapNameById123');
          expect(itemStats).toContain('mockGetAreaNameById123');
          expect(itemStats).toContain('Conjured Item');
          expect(itemStats).toContain('Unique (123)');
          expect(itemStats).toContain('Duration: 2 minutes (real time)');
          expect(itemStats).toContain('Requires mockGetEventNameByHolidayId123');
          expect(itemStats).toContain('This Item Begins a Quest');
          expect(itemStats).toContain('123 Slot');
          expect(itemStats).toContain('123 - 125 Damage+124 - 126 Damage');
          expect(itemStats).toContain('123 Armor');
          expect(itemStats).toContain('123 Block');
          expect(itemStats).toContain('test');
          expect(itemStats).toContain('<Random enchantment>');
          expect(itemStats).toContain('+123 Holy Resistance');
          expect(itemStats).toContain('+123 Fire Resistance');
          expect(itemStats).toContain('+123 Nature Resistance');
          expect(itemStats).toContain('+123 Frost Resistance');
          expect(itemStats).toContain('+123 Shadow Resistance');
          expect(itemStats).toContain('+123 Arcane Resistance');
          expect(itemStats).toContain('Blue Socket');
          expect(itemStats).toContain('Blue Socket');
          expect(itemStats).toContain('Blue Socket');
          expect(itemStats).toContain('Socket Bonus: mockgetFactionNameByIdGetSocketBonusById123');
          expect(itemStats).toContain('Durability 123 / 123');
          expect(itemStats).toContain('Classes: Warrior, Paladin, Rogue');
          expect(itemStats).toContain('Races: Orc');
          expect(itemStats).toContain('Requires Level 123');
          expect(itemStats).toContain('Requires: profession (123)');
          expect(itemStats).toContain('Requires mockGetSpellNameById123');
          expect(itemStats).toContain('Requires mockGetFactionNameById123 (Hostile)');
          expect(itemStats).toContain('Locked');
          expect(itemStats).toContain('Requires mockItemNameById');
          expect(itemStats).toContain('Requires mockItemNameById');
          expect(itemStats).toContain('Requires Lockpicking (1)');
          expect(itemStats).toContain('mockGetSpellDescriptionById123');
          expect(itemStats).toContain('"123"');
          expect(itemStats).toContain('<Right Click To Read>');
          expect(itemStats).toContain('123 Charges');
        });
      }));
    });
  });
});
